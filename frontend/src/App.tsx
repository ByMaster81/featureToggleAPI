import { useState, useEffect } from 'react';
import type { FormEvent, ChangeEvent } from 'react';
import axios from 'axios';
import Modal from 'react-modal';
import './App.css';

// --- Arayüzler (Interfaces) ---
interface Tenant {
  id: string;
  name: string;
}
interface Feature {
  id: string;
  name: string;
  description: string | null;
}
interface FeatureFlag {
  id: string;
  env: string;
  enabled: boolean;
  tenantId: string;
  featureId: string;
  evaluationStrategy: string;
  evaluationDetailsJson: any;
  feature: Feature;
}
type EditableFlagData = Partial<Omit<FeatureFlag, 'feature' | 'tenantId'>> & { featureId?: string };

const apiClient = axios.create({
  baseURL: 'http://localhost:5001/api',
});

const ENVIRONMENTS = ['dev', 'staging', 'prod'];
const STRATEGIES = ['BOOLEAN', 'PERCENTAGE', 'USER'];

Modal.setAppElement('#root');

function App() {
  // --- STATE TANIMLAMALARI ---
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [jwt, setJwt] = useState<string | null>(null);

  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [features, setFeatures] = useState<Feature[]>([]);
  const [selectedTenant, setSelectedTenant] = useState<string>('');
  const [selectedEnv, setSelectedEnv] = useState<string>('prod');
  const [featureFlags, setFeatureFlags] = useState<FeatureFlag[]>([]);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingFlag, setEditingFlag] = useState<EditableFlagData | null>(null);

  // --- API FONKSİYONLARI ---

  const handleDeleteFlag = async (flagToDelete: FeatureFlag) => {
    const isConfirmed = window.confirm(`'${flagToDelete.feature.name}' özelliğini (${flagToDelete.env}) silmek istediğinizden emin misiniz? Bu işlem geri alınamaz.`);
    
    if (!isConfirmed) {
      return; 
    }

    try {
      const payload = {
        tenantId: flagToDelete.tenantId,
        featureId: flagToDelete.feature.id,
        env: flagToDelete.env,
      };

      await apiClient.delete('/features', { data: payload });

      alert(`'${flagToDelete.feature.name}' başarıyla silindi.`);
      
      // 3. Liste'yi yenile
      fetchFeatures(selectedTenant, selectedEnv);

    } catch (err: any) {
      alert(`Hata: ${err.response?.data?.message || "Silme işlemi başarısız oldu."}`);
    }
  };


  const fetchTenants = async () => {
    try {
      const response = await apiClient.get<Tenant[]>('/tenants');
      setTenants(response.data);
      if (response.data.length > 0 && !selectedTenant) {
        setSelectedTenant(response.data[0].name);
      }
    } catch (err) {
      setError('Tenant listesi yüklenemedi.');
      console.error(err);
    }
  };
  
  const fetchAllFeatureDefinitions = async () => {
    try {
      const response = await apiClient.get<Feature[]>('/features/definitions');
      setFeatures(response.data);
    } catch (err) {
      console.error("Tüm özellik tanımları çekilirken hata", err);
    }
  };

  const fetchFeatures = async (tenant: string, env: string) => {
    if (!tenant || !env) return;
    setLoading(true);
    try {
      const response = await apiClient.get(`/features/raw?tenant=${tenant}&env=${env}`);
      setFeatureFlags(response.data.data);
      setError(null);
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || `Özellikler yüklenemedi.`;
      setError(errorMessage);
      setFeatureFlags([]);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleFeature = async (flagToToggle: FeatureFlag) => {
    try {
      const payload = {
        tenantId: flagToToggle.tenantId,
        featureId: flagToToggle.feature.id,
        env: flagToToggle.env,
        enabled: !flagToToggle.enabled,
        evaluationStrategy: flagToToggle.evaluationStrategy,
        evaluationDetailsJson: flagToToggle.evaluationDetailsJson
      };
      await apiClient.post('/features', payload);
      fetchFeatures(selectedTenant, selectedEnv);
    } catch (err: any) {
      alert(`Hata: ${err.response?.data?.message || "Güncelleme başarısız."}`);
    }
  };

  const handleSaveFlag = async (e: FormEvent) => {
    e.preventDefault();
    if (!editingFlag || !editingFlag.featureId || !editingFlag.env) {
      alert("Lütfen tüm zorunlu alanları doldurun."); return;
    }
    const currentTenant = tenants.find(t => t.name === selectedTenant);
    if (!currentTenant) return;

    try {
      let detailsJson = {};
      if (editingFlag.evaluationStrategy === 'PERCENTAGE') {
        detailsJson = { percentage: Number(editingFlag.evaluationDetailsJson?.percentage || 0) };
      } else if (editingFlag.evaluationStrategy === 'USER') {
        const users = (editingFlag.evaluationDetailsJson?.users || '').split(',').map((u: string) => u.trim()).filter(Boolean);
        detailsJson = { users };
      }

      const payload = {
        tenantId: currentTenant.id,
        featureId: editingFlag.featureId,
        env: editingFlag.env,
        enabled: !!editingFlag.enabled,
        evaluationStrategy: editingFlag.evaluationStrategy,
        evaluationDetailsJson: detailsJson,
      };
      
      await apiClient.post('/features', payload);
      closeModal();
      fetchFeatures(selectedTenant, selectedEnv);
    } catch (err) { alert("Flag kaydedilirken hata oluştu."); }
  };

  // --- MODAL & FORM YÖNETİMİ ---
  const openModalForCreate = () => {
    setEditingFlag({
      env: selectedEnv,
      enabled: false,
      evaluationStrategy: 'BOOLEAN',
      featureId: features.length > 0 ? features[0].id : '',
      evaluationDetailsJson: {}
    });
    setIsModalOpen(true);
  };

  const openModalForEdit = (flag: FeatureFlag) => {
    let details = flag.evaluationDetailsJson;
    if (flag.evaluationStrategy === 'USER' && Array.isArray(details?.users)) {
      details = { ...details, users: details.users.join(', ') };
    }
    setEditingFlag({ ...flag, evaluationDetailsJson: details });
    setIsModalOpen(true);
  };
  
  const closeModal = () => { setIsModalOpen(false); setEditingFlag(null); };

  const handleFormChange = (e: ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    const val = type === 'checkbox' ? (e.target as HTMLInputElement).checked : value;
    setEditingFlag(prev => prev ? { ...prev, [name]: val } : null);
  };

  const handleDetailsChange = (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setEditingFlag(prev => prev ? { ...prev, evaluationDetailsJson: { ...prev.evaluationDetailsJson, [name]: value } } : null);
  };

  // --- LOGIN & EFFECT'LER ---
  const handleLogin = () => {
    const testToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6InRlc3QtdXNlci0xMjMiLCJ0ZW5hbnRJZCI6InRlc3QtdGVuYW50LTQ1NiJ9.Ux0BP7-sjPpR7bbaiET0-0Hyl-BVsZcnoGM3a10WZao';
    setJwt(testToken);
    apiClient.defaults.headers.common['Authorization'] = `Bearer ${testToken}`;
  };
  
  const handleLogout = () => {
    setJwt(null);
    delete apiClient.defaults.headers.common['Authorization'];
    setTenants([]); setFeatureFlags([]); setSelectedTenant('');
  };

  useEffect(() => { if (jwt) { fetchTenants(); fetchAllFeatureDefinitions(); } }, [jwt]);
  useEffect(() => { if (jwt && selectedTenant && selectedEnv) { fetchFeatures(selectedTenant, selectedEnv); } }, [jwt, selectedTenant, selectedEnv]);

  // --- RENDER (GÖRSELLEŞTİRME) ---
  return (
    <div className="container">
      <div className="header">
        <h1>Feature Toggle Paneli</h1>
        <div className="auth-controls">
          {!jwt ? <button onClick={handleLogin} className="login-button">Giriş Yap</button> : <button onClick={handleLogout} className="logout-button">Çıkış Yap</button>}
        </div>
      </div>

      {jwt && tenants.length > 0 && (
        <div className="controls-panel">
          <div className="control-group">
            <label htmlFor="tenant-select">Tenant:</label>
            <select id="tenant-select" value={selectedTenant} onChange={(e) => setSelectedTenant(e.target.value)}>
              {tenants.map(t => <option key={t.id} value={t.name}>{t.name}</option>)}
            </select>
          </div>
          <div className="control-group">
            <label>Environment:</label>
            <div className="env-buttons">
              {ENVIRONMENTS.map(env => <button key={env} className={`env-button ${selectedEnv === env ? 'active' : ''}`} onClick={() => setSelectedEnv(env)}>{env}</button>)}
            </div>
          </div>
        </div>
      )}

      <div className="toolbar">
        <button onClick={openModalForCreate} className="add-button" disabled={!jwt}>+ Yeni Flag Ekle</button>
      </div>

      {jwt && (
        loading ? <h2>Yükleniyor...</h2> : error ? <h2 style={{ color: 'red' }}>Hata: {error}</h2> :
        <div className="feature-list">
          {featureFlags.length > 0 ? featureFlags.map((flag) => (
            <div key={flag.id} className="feature-item">
              <div className="feature-info">
                <span className="feature-name">{flag.feature.name}</span>
                <p className="feature-description">{flag.feature.description}</p>
              </div>
              <div className="feature-controls">
                <span className={`status ${flag.enabled ? 'enabled' : 'disabled'}`}>{flag.enabled ? 'AÇIK' : 'KAPALI'}</span>
                <button onClick={() => handleToggleFeature(flag)} className="toggle-button" disabled={!jwt}>Değiştir</button>
                <button onClick={() => openModalForEdit(flag)} className="edit-button" disabled={!jwt}>Düzenle</button>
                <button onClick={() => handleDeleteFlag(flag)} className="delete-button" disabled={!jwt}>Sil</button>
              </div>
            </div>
          )) : <p>Bu tenant/ortam için özellik bulunamadı.</p>}
        </div>
      )}
      
      <Modal isOpen={isModalOpen} onRequestClose={closeModal} className="modal" overlayClassName="overlay">
        {editingFlag && (
          <form onSubmit={handleSaveFlag}>
            <h2>{editingFlag.id ? 'Feature Flag Düzenle' : 'Yeni Feature Flag'}</h2>
            
            <div className="form-group">
              <label htmlFor="featureId">Özellik</label>
              <select name="featureId" id="featureId" value={editingFlag.featureId} onChange={handleFormChange} required disabled={!!editingFlag.id}>
                <option value="" disabled>Bir özellik seçin</option>
                {features.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
              </select>
            </div>
            
            <div className="form-group">
              <label htmlFor="env">Ortam (Environment)</label>
              <select name="env" id="env" value={editingFlag.env} onChange={handleFormChange} required disabled={!!editingFlag.id}>
                {ENVIRONMENTS.map(e => <option key={e} value={e}>{e}</option>)}
              </select>
            </div>
            
            <div className="form-group-inline">
              <label htmlFor="enabled">Aktif (Enabled)</label>
              <input name="enabled" id="enabled" type="checkbox" checked={!!editingFlag.enabled} onChange={handleFormChange} />
            </div>
            
            <div className="form-group">
              <label htmlFor="evaluationStrategy">Değerlendirme Stratejisi</label>
              <select name="evaluationStrategy" id="evaluationStrategy" value={editingFlag.evaluationStrategy} onChange={handleFormChange}>
                {STRATEGIES.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            
            {editingFlag.evaluationStrategy === 'PERCENTAGE' && (
              <div className="form-group">
                <label htmlFor="percentage">Yüzde (%)</label>
                <input name="percentage" id="percentage" type="number" min="0" max="100" value={editingFlag.evaluationDetailsJson?.percentage || ''} onChange={handleDetailsChange} />
              </div>
            )}
            
            {editingFlag.evaluationStrategy === 'USER' && (
              <div className="form-group">
                <label htmlFor="users">Kullanıcı ID'leri (virgülle ayırın)</label>
                <textarea name="users" id="users" value={editingFlag.evaluationDetailsJson?.users || ''} onChange={handleDetailsChange} />
              </div>
            )}

            <div className="form-actions">
              <button type="button" onClick={closeModal} className="button-secondary">İptal</button>
              <button type="submit" className="button-primary">Kaydet</button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
}

export default App;