import { FeatureFlag, Feature } from '@prisma/client';


type FeatureFlagWithFeature = FeatureFlag & {
  feature: Feature;
};

export interface EvaluatedFlag {
  name: string;
  enabled: boolean;
}

/**
 * Veritabanından gelen ham feature flag listesini alır ve her birini
 * stratejisine göre değerlendirerek nihai bir `enabled` durumu belirler.
 * @param flags - Veritabanından gelen, 'feature' bilgisi dahil edilmiş flag listesi.
 * @param userId - İsteği yapan kullanıcının ID'si (USER stratejisi için).
 * @param attributes - Gelecekte eklenebilecek diğer kullanıcı özellikleri (örn: { country: 'TR' }).
 * @returns Frontend'e gönderilmeye hazır, değerlendirilmiş flag listesi.
 */
export const evaluateFlags = (
  flags: FeatureFlagWithFeature[],
  userId?: string,
  attributes?: Record<string, any>
): EvaluatedFlag[] => {
  return flags.map((flag) => {
    let isEnabled = flag.enabled; //(master switch)

    // Sadece ana şalter açıksa, gelişmiş stratejiyi değerlendir.
    // Ana şalter kapalıysa, diğer her şey anlamsızdır ve flag kapalı kalır.
    if (isEnabled) {
      switch (flag.evaluationStrategy) {
        
        case 'PERCENTAGE':
          // JSON verisinden yüzdelik değeri al. Hata durumunda 0 kabul et.
          const percentage = (flag.evaluationDetailsJson as any)?.percentage ?? 0;
          // Rastgele bir sayı üret (0-100) ve yüzdelik dilimde olup olmadığını kontrol et.
          isEnabled = Math.random() * 100 < percentage;
          break;

        case 'USER':
          // JSON verisinden kullanıcı listesini al. Hata durumunda boş liste kabul et.
          const userList: string[] = (flag.evaluationDetailsJson as any)?.users ?? [];
          // Eğer bir userId geldiyse ve bu ID listede varsa, flag'i etkinleştir.
          isEnabled = userId ? userList.includes(userId) : false;
          break;

        case 'BOOLEAN':
        default:
          break;
      }
    }

 
    return {
      name: flag.feature.name,
      enabled: isEnabled,
    };
  });
};