import { evaluateFlags } from './evaluation.service';
import { EvaluationStrategy } from '@prisma/client';


describe('Evaluation Service', () => {

  // 'it' veya 'test' bloğu, tek bir test senaryosunu tanımlar.
  it('should return true for a simple BOOLEAN flag that is enabled', () => {
    const flags = [{
      enabled: true,
      evaluationStrategy: EvaluationStrategy.BOOLEAN,
      feature: { name: 'test-feature' }
    }] as any; // 'any' kullanarak tüm mock datayı yazmaktan kaçınıyoruz.

    const result = evaluateFlags(flags);
    
    
    expect(result[0].enabled).toBe(true);
  });

  it('should return false for a BOOLEAN flag that is disabled', () => {
    const flags = [{
      enabled: false,
      evaluationStrategy: EvaluationStrategy.BOOLEAN,
      feature: { name: 'test-feature' }
    }] as any;

    const result = evaluateFlags(flags);
    
    expect(result[0].enabled).toBe(false);
  });

  it('should evaluate PERCENTAGE strategy correctly', () => {
    const flags = [{
      enabled: true,
      evaluationStrategy: EvaluationStrategy.PERCENTAGE,
      evaluationDetailsJson: { percentage: 100 }, 
      feature: { name: 'percent-100' }
    }, {
      enabled: true,
      evaluationStrategy: EvaluationStrategy.PERCENTAGE,
      evaluationDetailsJson: { percentage: 0 }, 
      feature: { name: 'percent-0' }
    }] as any;

    const result = evaluateFlags(flags);

    expect(result[0].name).toBe('percent-100');
    expect(result[0].enabled).toBe(true);
    expect(result[1].name).toBe('percent-0');
    expect(result[1].enabled).toBe(false);
  });

  it('should evaluate USER strategy correctly', () => {
    const flags = [{
      enabled: true,
      evaluationStrategy: EvaluationStrategy.USER,
      evaluationDetailsJson: { users: ['user-123', 'user-abc'] },
      feature: { name: 'user-targeting' }
    }] as any;

    // Yetkili kullanıcı
    const resultForAllowedUser = evaluateFlags(flags, 'user-123');
    expect(resultForAllowedUser[0].enabled).toBe(true);
    
    // Yetkisiz kullanıcı
    const resultForDeniedUser = evaluateFlags(flags, 'user-xyz');
    expect(resultForDeniedUser[0].enabled).toBe(false);

    // userId olmadan
    const resultWithoutUser = evaluateFlags(flags);
    expect(resultWithoutUser[0].enabled).toBe(false);
  });

});