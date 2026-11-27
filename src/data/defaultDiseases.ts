import { DiseaseRecord } from '../types';

export const DEFAULT_DISEASES: DiseaseRecord[] = [
  // --- CITRUS DISEASES & KEY PESTS (8) ---
  {
    id: 'citrus_greening',
    cropType: 'citrus',
    vietnameseName: 'Bệnh Vàng lá gân xanh (Huanglongbing - HLB)',
    englishName: 'Citrus Greening / Huanglongbing',
    symptoms:
      'Lá xuất hiện các mảng màu vàng loang lổ (blotchy mottle) không đối xứng qua gân chính. Gân lá nổi gồ ghề, đôi khi hóa bần. Lá non mọc thẳng đứng kiểu tai thỏ. Quả nhỏ, méo mó lệch tâm, khi chín chuyển vàng ở phần cuống trước trong khi chóp quả còn xanh (đảo ngược màu), hạt lép màu nâu đen, tép chua đắng.',
    affectedPlantParts: ['leaf', 'fruit', 'stem'],
    causes:
      'Vi khuẩn nội bào Candidatus Liberibacter asiaticus ký sinh trong mạch dẫn libe, lây truyền chủ yếu qua côn trùng môi giới Rầy chổng cánh (Diaphorina citri) và qua mắt ghép nhiễm bệnh.',
    favorableConditions:
      'Thời tiết ấm 25-30°C trùng với các đợt ra lộc non vụ Xuân và vụ Thu khi mật độ rầy chổng cánh tăng cao tại các vùng trồng cam bưởi Nghệ An, Hà Tĩnh.',
    preventionMethods:
      'Trồng cây giống sạch bệnh được nhân trong nhà lưới cách ly côn trùng. Điều khiển ra lộc non tập trung để dễ quản lý rầy chổng cánh; trồng xen ổi giúp xua đuổi rầy. Tuyệt đối không lấy mắt ghép từ cây nghi bệnh.',
    safeManagement:
      'Bệnh hiện chưa có thuốc đặc trị chữa khỏi khi đã nhiễm nặng. Cần thăm vườn hằng tuần: nếu mới chớm trên một vài cành, cắt tỉa bỏ cành bệnh và khử trùng kéo cắt bằng cồn; nếu cây nhiễm nặng toàn tán, phải đốn bỏ cả gốc tiêu hủy để tránh lây cả vườn. Song song phòng trừ rầy chổng cánh bảo vệ đợt lộc non.',
    references:
      'Cục Bảo vệ Thực vật (Bộ NN&PTNT); Viện Bảo vệ Thực vật (VAAS); Quy trình IPM trên cây ăn quả có múi.',
    verificationStatus: 'verified',
    verifiedBy: 'Viện Bảo vệ Thực vật Việt Nam & Cục Bảo vệ Thực vật',
    standardCode: 'TCVN 13268-4:2021 (Phương pháp điều tra sinh vật gây hại cây ăn quả)',
    reviewDate: '2026-11-26',
    sampleImageUrl: '/images/citrus_leaf_hlb.jpg',
    imageSource: 'Ảnh mẫu chuẩn bệnh Vàng lá gân xanh (HLB) - Bộ tiêu chuẩn AgriVision AI',
    imageSourceUrl: 'https://commons.wikimedia.org/wiki/Category:Citrus_greening_disease',
    createdAt: '2026-01-10T00:00:00.000Z',
    updatedAt: '2026-11-26T22:15:00.000Z',
  },
  {
    id: 'citrus_psyllid',
    cropType: 'citrus',
    vietnameseName: 'Rầy chổng cánh hại cam quýt (Môi giới bệnh HLB)',
    englishName: 'Asian Citrus Psyllid (Diaphorina citri)',
    symptoms:
      'Con trưởng thành dài khoảng 2-3 mm, màu nâu xám, cánh có đốm nâu viền trắng; khi đậu trên đọt non luôn chổng phần đuôi lên góc khoảng 45 độ rất đặc trưng. Ấu trùng thân dẹt màu vàng cam, bám dày ở mặt dưới lá non và chồi non, tiết ra các sợi sáp trắng xoắn và dịch ngọt (dễ kéo theo nấm bồ hóng đen).',
    affectedPlantParts: ['leaf', 'stem'],
    causes:
      'Côn trùng chích hút Diaphorina citri (họ Psyllidae). Ngoài việc làm chồi non xoăn còi cọc, đây là môi giới duy nhất ngoài tự nhiên truyền vi khuẩn bệnh Vàng lá gân xanh (HLB) nguy hiểm.',
    favorableConditions:
      'Bùng phát mạnh vào các đợt cây ra lộc non (vụ Xuân tháng 2-4, vụ Hè Thu), thời tiết ấm khô xen kẽ nắng mưa.',
    preventionMethods:
      'Tỉa cành, bón phân tập trung cho cây ra đọt non đồng loạt để cắt lứa rầy. Bảo vệ thiên địch tự nhiên như kiến vàng, bọ rùa, ong ký sinh. Treo bẫy dính màu vàng để theo dõi sớm.',
    safeManagement:
      'Khi mới thấy rầy chổng cánh xuất hiện trên lộc non, ưu tiên phun dầu khoáng nông nghiệp hoặc chế phẩm sinh học (nấm xanh Metarhizium, nấm trắng Beauveria) vào sáng sớm hoặc chiều mát. Nếu mật độ rầy cao vượt ngưỡng, sử dụng thuốc đặc trị trong Danh mục được Cục BVTV cho phép theo nguyên tắc 4 đúng.',
    references:
      'Cục Bảo vệ Thực vật; Viện Bảo vệ Thực vật (VAAS); USDA Agricultural Research Service (ARS).',
    verificationStatus: 'verified',
    verifiedBy: 'Viện Bảo vệ Thực vật Việt Nam & USDA ARS',
    standardCode: 'TCVN 13268-4:2021 (Điều tra dịch hại cây ăn quả có múi)',
    reviewDate: '2026-11-26',
    sampleImageUrl: '/images/citrus_psyllid.jpg',
    imageSource: 'Ảnh thực tế: David Hall, USDA Agricultural Research Service (Wikimedia Commons)',
    imageSourceUrl: 'https://commons.wikimedia.org/wiki/File:Asian_Citrus_Psyllid_adult.jpg',
    createdAt: '2026-01-12T00:00:00.000Z',
    updatedAt: '2026-11-26T22:15:00.000Z',
  },
  {
    id: 'citrus_canker',
    cropType: 'citrus',
    vietnameseName: 'Bệnh Loét cam quýt (Bacterial Canker)',
    englishName: 'Citrus Bacterial Canker',
    symptoms:
      'Vết bệnh ban đầu là chấm nhỏ trong như giọt dầu, sau phồng lên thành nốt sần sùi màu nâu xám, bề mặt nứt nẻ như miệng núi lửa ở CẢ HAI MẶT LÁ. Đặc trưng có quầng vàng sáng (halo) bao quanh vết loét. Trên quả tạo các đốm loét gồ nâu sần sùi, dễ gây rụng quả non.',
    affectedPlantParts: ['leaf', 'fruit', 'stem'],
    causes:
      'Vi khuẩn Xanthomonas citri pv. citri, xâm nhập qua khí khổng tự nhiên và các vết thương cơ giới do mưa gió va đập hoặc đường đục của sâu vẽ bùa.',
    favorableConditions:
      'Mưa to gió lớn, bão nhiệt đới kéo dài kết hợp nhiệt độ cao (28-35°C), nhất là giai đoạn lá non và quả non.',
    preventionMethods:
      'Phòng trừ tốt sâu vẽ bùa (Phyllocnistis citrella) vì đường đục của sâu là cửa ngõ cho vi khuẩn xâm nhập. Trồng hàng cây chắn gió quanh vườn để giảm trầy xước lá khi có gió bão.',
    safeManagement:
      'Cắt tỉa cành lá bị bệnh vào ngày nắng khô và thu gom tiêu hủy (không tỉa khi trời ẩm ướt). Sau các đợt mưa bão hoặc khi lộc non mới nhú, phun phòng bằng thuốc gốc đồng (Booc-đô 1%, Đồng Oxyclorua, Đồng Hydroxide) hoặc chế phẩm vi sinh đối kháng Bacillus subtilis.',
    references:
      'Viện Bảo vệ Thực vật (VAAS); FAO Citrus Disease Management; UGA / Bugwood Network.',
    verificationStatus: 'verified',
    verifiedBy: 'Viện Bảo vệ Thực vật Việt Nam & FAO',
    standardCode: 'TCVN 13268-4:2021; FAO Citrus Pathology Guidelines',
    reviewDate: '2026-11-26',
    sampleImageUrl: '/images/citrus_canker.jpg',
    imageSource: 'Ảnh thực tế: UGA / Bugwood Network (UGA1262029, Wikimedia Commons)',
    imageSourceUrl: 'https://commons.wikimedia.org/wiki/File:Citrus_canker_Xanthomonas_citri_-_symptoms_on_leaves_UGA1262029.jpg',
    createdAt: '2026-01-15T00:00:00.000Z',
    updatedAt: '2026-11-26T22:15:00.000Z',
  },
  {
    id: 'citrus_scab',
    cropType: 'citrus',
    vietnameseName: 'Bệnh Ghẻ sẹo cam quýt (Citrus Scab)',
    englishName: 'Citrus Scab',
    symptoms:
      'Vết bệnh nhô hẳn lên khỏi bề mặt lá non và vỏ quả non thành các mụn cóc, gai u lồi màu vàng nâu đến xám nhạt (nhiều nhất ở mặt dưới lá và trên vỏ quả non). Khác với bệnh loét, vết ghẻ sẹo thường làm lá bị vặn vẹo nhăn nheo biến dạng và không có quầng vàng sáng rõ quanh vết.',
    affectedPlantParts: ['leaf', 'fruit', 'stem'],
    causes:
      'Nấm Elsinoë fawcettii. Bào tử nấm tồn tại trên các vết sẹo cũ trên cây và phát tán nhờ giọt nước mưa bắn và sương ẩm.',
    favorableConditions:
      'Nhiệt độ ôn hòa 20-25°C kèm mưa phùn, sương mù nhiều và độ ẩm không khí cao trên 90% lúc cây ra lộc non hoặc quả mới đậu.',
    preventionMethods:
      'Cắt tỉa tạo tán thông thoáng sau thu hoạch, loại bỏ cành sâu bệnh sát mặt đất. Tránh tưới phun mưa lên tán vào chiều tối.',
    safeManagement:
      'Phun phòng trừ sớm bằng dung dịch Booc-đô, gốc đồng sinh học hoặc nấm đối kháng vào 2 thời điểm vàng: khi chồi non dài 1-2 cm và khi hoa rụng cánh 2/3 để bảo vệ vỏ quả non.',
    references:
      'Trung tâm Khuyến nông Quốc gia; University of Hawaii CTAHR (Scot Nelson); Viện BVTV.',
    verificationStatus: 'verified',
    verifiedBy: 'Trung tâm Khuyến nông Quốc gia & Đại học Hawaii CTAHR',
    standardCode: 'TCVN 13268-4:2021 (Điều tra sinh vật gây hại cây ăn quả)',
    reviewDate: '2026-11-26',
    sampleImageUrl: '/images/citrus_scab.jpg',
    imageSource: 'Ảnh thực tế: Scot Nelson, ĐH Hawaii (CC0 Public Domain, Wikimedia Commons)',
    imageSourceUrl: 'https://commons.wikimedia.org/wiki/File:Fungal_scab_of_rough_lemon_(9504944200).jpg',
    createdAt: '2026-01-20T00:00:00.000Z',
    updatedAt: '2026-11-26T22:15:00.000Z',
  },
  {
    id: 'citrus_leafminer',
    cropType: 'citrus',
    vietnameseName: 'Sâu vẽ bùa hại cam quýt',
    englishName: 'Citrus Leafminer (Phyllocnistis citrella)',
    symptoms:
      'Trên bề mặt lá non (đặc biệt ở mặt dưới và gần gân lá) xuất hiện các đường đục ngoằn ngoèo màu trắng bạc óng ánh giống nét vẽ bùa. Lá non bị sâu hại xoăn queo, biến dạng, chậm lớn và tạo vết thương cho vi khuẩn bệnh loét cam xâm nhập.',
    affectedPlantParts: ['leaf'],
    causes:
      'Sâu non của loài ngài nhỏ Phyllocnistis citrella đục ăn phần nhu mô ngay dưới lớp biểu bì lá non.',
    favorableConditions:
      'Gây hại quanh năm vào mỗi đợt cây ra lộc non (đặc biệt lộc Hè và lộc Thu có thời tiết ấm ẩm).',
    preventionMethods:
      'Tỉa cành, bón phân thúc lộc ra tập trung đồng loạt để hạn chế nguồn thức ăn liên tục của sâu. Bảo vệ thiên địch (ong ký sinh, kiến vàng).',
    safeManagement:
      'Khi lộc non vừa nhú dài 1-2 cm, phun phòng bằng dầu khoáng nông nghiệp (SK Enspray, DC-Tron Plus...) hoặc chế phẩm sinh học Abamectin/Azadirachtin (chiết xuất hạt neem) định kỳ 7-10 ngày trong giai đoạn lộc còn non mềm.',
    references:
      'Cục Bảo vệ Thực vật; Viện Bảo vệ Thực vật (VAAS); Wikimedia Commons (Phyllocnistis citrella).',
    verificationStatus: 'verified',
    verifiedBy: 'Viện Bảo vệ Thực vật Việt Nam',
    standardCode: 'TCVN 13268-4:2021 (Điều tra sinh vật gây hại cây ăn quả)',
    reviewDate: '2026-11-26',
    sampleImageUrl: '/images/citrus_leafminer.jpg',
    imageSource: 'Ảnh thực tế: Đường đục sâu vẽ bùa trên lá cam (Wikimedia Commons)',
    imageSourceUrl: 'https://commons.wikimedia.org/wiki/File:Citrus_leaf_miner.jpg',
    createdAt: '2026-02-01T00:00:00.000Z',
    updatedAt: '2026-11-26T22:15:00.000Z',
  },
  {
    id: 'citrus_gummosis',
    cropType: 'citrus',
    vietnameseName: 'Bệnh Thối gốc chảy gôm (Nứt thân xì mủ)',
    englishName: 'Citrus Phytophthora Gummosis / Collar Rot',
    symptoms:
      'Vỏ cây vùng cổ rễ sát mặt đất hoặc chạc ba thân cành bị thâm nâu ướt, nứt dọc và rỉ ra chất nhựa gôm màu vàng nâu hay hổ phách. Khi cạo nhẹ lớp vỏ ngoài thấy phần gỗ và tượng tầng bên dưới có màu nâu sẫm thối nhũn, có mùi chua. Lá cả tán chuyển vàng gân giữa rồi rụng, cây suy kiệt chết dần.',
    affectedPlantParts: ['stem', 'other'],
    causes:
      'Nấm giả (Oomycete) Phytophthora parasitica / Phytophthora citrophthora sống trong đất ẩm úng, xâm nhập qua vết thương ở gốc thân hoặc mắt ghép quá thấp.',
    favorableConditions:
      'Vườn đất trũng đọng nước sau mưa kéo dài, tủ gốc sát thân quá ẩm, bón phân chuồng tươi chưa hoai sát gốc hoặc làm tổn thương vỏ gốc khi làm cỏ.',
    preventionMethods:
      'Đào rãnh thoát nước quanh vườn và giữa các hàng cây vào mùa mưa; trồng cây trên mô cao, không để vết ghép sát mặt đất. Quét nước vôi hoặc dung dịch Booc-đô quanh gốc cao 50-60 cm đầu mùa mưa.',
    safeManagement:
      'Cạo sạch phần vỏ gốc bị thối đến phần gỗ lành bằng dao sắc đã khử trùng, rồi quét thuốc gốc đồng (Booc-đô 1%, Đồng Oxyclorua) hoặc thuốc đặc trị nấm Phytophthora (Metalaxyl, Fosetyl-aluminium) lên vết cạo và tưới vùng rễ kết hợp nấm đối kháng Trichoderma.',
    references:
      'Viện Cây ăn quả Miền Nam (SOFRI); Cục Bảo vệ Thực vật; Wikimedia Commons (Phytophthora collar rot).',
    verificationStatus: 'verified',
    verifiedBy: 'Viện Cây ăn quả Miền Nam & Cục Bảo vệ Thực vật',
    standardCode: 'TCVN 13268-4:2021; Quy trình phòng chống bệnh hại cây có múi',
    reviewDate: '2026-11-26',
    sampleImageUrl: '/images/citrus_gummosis.jpg',
    imageSource: 'Ảnh thực tế: Thối cổ rễ Phytophthora trên cây có múi (Wikimedia Commons)',
    imageSourceUrl: 'https://commons.wikimedia.org/wiki/File:Lemon_tree_with_phytophtora_02_-_collar_rot.jpg',
    createdAt: '2026-02-02T00:00:00.000Z',
    updatedAt: '2026-11-26T22:15:00.000Z',
  },
  {
    id: 'citrus_brown_aphid',
    cropType: 'citrus',
    vietnameseName: 'Rệp muội đen/nâu hại cam quýt',
    englishName: 'Brown Citrus Aphid (Toxoptera citricida)',
    symptoms:
      'Rệp thân mềm hình quả lê màu nâu sẫm đến đen bóng tụ tập dày đặc kín cả đọt non, cuống hoa và mặt dưới lá non để chích hút nhựa. Ngọn non bị xoăn lại, rụng hoa và quả non; dịch ngọt của rệp tiết ra thu hút kiến và làm đen lá quả do nấm bồ hóng.',
    affectedPlantParts: ['leaf', 'stem'],
    causes:
      'Rệp muội Toxoptera citricida / Aphis gossypii. Ngoài gây xoăn đọt, rệp muội nâu là môi giới truyền bệnh virus Tristeza (CTV) gây tàn lụi cây có múi.',
    favorableConditions:
      'Phát sinh mạnh vào các đợt cây ra lộc non vụ Xuân và Thu, thời tiết ấm râm mát ít mưa to.',
    preventionMethods:
      'Cắt tỉa cành vượt, điều khiển ra lộc tập trung; bảo vệ bọ rùa, ruồi ăn rệp và ong ký sinh trong vườn.',
    safeManagement:
      'Với mật độ nhẹ có thể dùng vòi nước áp lực vừa rửa trôi rệp hoặc phun nước rửa chén sinh học pha loãng / dầu khoáng nông nghiệp. Khi rệp bùng phát dày trên nhiều đọt non, phun chế phẩm sinh học hoặc thuốc trừ sâu chích hút ít độc thiên địch theo nguyên tắc 4 đúng.',
    references:
      'Cục Bảo vệ Thực vật; USDA / Bugwood Network (Toxoptera citricida).',
    verificationStatus: 'verified',
    verifiedBy: 'Viện Bảo vệ Thực vật Việt Nam & USDA',
    standardCode: 'TCVN 13268-4:2021 (Điều tra dịch hại cây ăn quả)',
    reviewDate: '2026-11-26',
    sampleImageUrl: '/images/citrus_brown_aphid.png',
    imageSource: 'Ảnh thực tế: Đám rệp muội nâu trên chồi non cam (Wikimedia Commons)',
    imageSourceUrl: 'https://commons.wikimedia.org/wiki/File:Brown_citrus_aphid_5194050.png',
    createdAt: '2026-02-03T00:00:00.000Z',
    updatedAt: '2026-11-26T22:15:00.000Z',
  },
  {
    id: 'citrus_black_spot',
    cropType: 'citrus',
    vietnameseName: 'Bệnh Đốm đen vỏ quả cam quýt',
    englishName: 'Citrus Black Spot (Phyllosticta citricarpa)',
    symptoms:
      'Trên vỏ quả gần chín xuất hiện các đốm tròn nhỏ hơi lõm xuống (hard spot), tâm màu xám trắng có các chấm đen li ti (ổ bào tử nấm), viền ngoài màu nâu đen hoặc nâu đỏ rõ rệt. Đốm bệnh làm xấu mã quả nặng và có thể gây rụng quả trước khi thu hoạch.',
    affectedPlantParts: ['fruit', 'leaf'],
    causes:
      'Nấm Phyllosticta citricarpa (tên cũ Guignardia citricarpa). Bào tử nấm phát tán từ lá rụng mục dưới tán cây lên quả non nhờ mưa bắn.',
    favorableConditions:
      'Vườn cây già, tán rậm rạp, nhiều lá rụng ẩm mục dưới gốc kết hợp mưa nhiều khi quả còn non và nắng nóng khi quả sắp chín.',
    preventionMethods:
      'Thu gom lá rụng dưới gốc đem ủ phân với nấm Trichoderma hoặc phủ lớp che phủ đất. Tỉa cành thông thoáng sau thu hoạch.',
    safeManagement:
      'Phun phòng bằng dung dịch gốc đồng (Booc-đô, Đồng Oxyclorua) hoặc thuốc trừ nấm được phép giai đoạn sau rụng cánh hoa 1-4 tháng (lúc quả còn xanh non, vì nấm xâm nhập sớm nhưng ủ bệnh đến khi quả chín mới hiện vết).',
    references:
      'Cục Bảo vệ Thực vật; Bugwood Network (5372647); FAO Citrus Pathology.',
    verificationStatus: 'verified',
    verifiedBy: 'Viện Bảo vệ Thực vật & Bugwood Network',
    standardCode: 'TCVN 13268-4:2021; FAO Citrus Pathology Guidelines',
    reviewDate: '2026-11-26',
    sampleImageUrl: '/images/citrus_black_spot.jpg',
    imageSource: 'Ảnh thực tế: Vết bệnh đốm đen trên vỏ cam (Bugwood 5372647, Wikimedia Commons)',
    imageSourceUrl: 'https://commons.wikimedia.org/wiki/File:Citrus_Black_Spot_lesions.jpg',
    createdAt: '2026-02-04T00:00:00.000Z',
    updatedAt: '2026-11-26T22:15:00.000Z',
  },

  // --- RICE DISEASES & KEY PESTS (8) ---
  {
    id: 'rice_blast',
    cropType: 'rice',
    vietnameseName: 'Bệnh Đạo ôn lúa (Đạo ôn lá & Cổ bông)',
    englishName: 'Rice Blast',
    symptoms:
      'Trên lá xuất hiện vết bệnh hình mắt én (hình thoi nhọn hai đầu), tâm màu xám tro, viền nâu đậm, ngoài cùng có quầng vàng nhạt. Vết cấp tính màu xám xanh lan rất nhanh làm lá cháy rụi. Trên cổ bông hoặc gié lúa, vết bệnh thâm nâu đen lõm vào làm gãy gục cổ bông, hạt lép trắng hoàn toàn.',
    affectedPlantParts: ['leaf', 'stem', 'fruit', 'other'],
    causes:
      'Nấm Magnaporthe oryzae (tên cũ Pyricularia oryzae). Bào tử nấm phát tán rất xa theo gió, bám lại trên tàn dư rơm rạ và cỏ dại.',
    favorableConditions:
      'Trời âm u kéo dài, mưa phùn, sương mù dày, đêm lạnh ngày ấm (18-26°C), ẩm độ trên 90%, đặc biệt ở ruộng bón thừa phân đạm (N) hoặc cấy quá dày.',
    preventionMethods:
      'Sử dụng giống lúa ít nhiễm, gieo cấy đúng thời vụ, mật độ hợp lý. Bón phân cân đối N-P-K, bổ sung phân Silic - Kali giúp vách tế bào lá cứng cáp.',
    safeManagement:
      'Khi thấy vết chấm kim hoặc vết mắt én cấp tính trên lá: NGỪNG BÓN ĐẠM và ngưng phun phân bón lá giàu đạm ngay lập tức, giữ nước ruộng ổn định 3-5 cm. Phun phòng trừ kịp thời theo ngưỡng bằng chế phẩm sinh học (như Kasugamycin, Validamycin, Chaetomium) hoặc thuốc đặc trị được Bộ NN&PTNT cấp phép (Tricyclazole, Isoprothiolane...) đúng nguyên tắc 4 đúng.',
    references:
      'Viện Nghiên cứu Lúa Quốc tế (IRRI); Cục Bảo vệ Thực vật; Viện Khoa học Nông nghiệp Việt Nam (VAAS).',
    verificationStatus: 'verified',
    verifiedBy: 'Viện Nghiên cứu Lúa Quốc tế (IRRI) & Cục Bảo vệ Thực vật',
    standardCode: 'QCVN 01-166:2014/BNNPTNT (Điều tra phát hiện dịch hại lúa); TCVN 13268-1:2021',
    reviewDate: '2026-11-26',
    sampleImageUrl: '/images/rice_leaf_blast.jpg',
    imageSource: 'Ảnh mẫu chuẩn bệnh Đạo ôn lá lúa - Bộ tiêu chuẩn AgriVision AI',
    imageSourceUrl: 'https://commons.wikimedia.org/wiki/Category:Magnaporthe_oryzae',
    createdAt: '2026-01-10T00:00:00.000Z',
    updatedAt: '2026-11-26T22:15:00.000Z',
  },
  {
    id: 'rice_bacterial_blight',
    cropType: 'rice',
    vietnameseName: 'Bệnh Bạc lá lúa (Cháy bìa lá vi khuẩn)',
    englishName: 'Bacterial Leaf Blight of Rice',
    symptoms:
      'Vết bệnh thường bắt đầu từ chóp lá hoặc mép lá lan xuống theo đường gợn sóng rất rõ ranh giới giữa phần bệnh và phần xanh. Lá bệnh chuyển màu vàng lục rồi bạc trắng như rơm khô và cuộn lại. Sáng sớm có sương, mặt vết bệnh ứa giọt dịch vi khuẩn vàng đục, khi khô thành hạt cườm nhỏ.',
    affectedPlantParts: ['leaf'],
    causes:
      'Vi khuẩn Xanthomonas oryzae pv. oryzae, xâm nhập qua thủy khổng ở mép lá và qua các vết xây xát do gió bão.',
    favorableConditions:
      'Mưa giông, gió bão mạnh (nhiệt độ 28-34°C, ẩm độ cao) thường gặp ở vụ Hè Thu/Mùa, ruộng ngập sâu hoặc bón thừa đạm lúc làm đòng.',
    preventionMethods:
      'Chọn giống chống chịu bạc lá trong vụ Mùa/Hè Thu. Không bón thúc đạm muộn trước khi có dự báo mưa bão. Giữ mực nước ruộng vừa phải.',
    safeManagement:
      'Tuyệt đối không lội ruộng hoặc kéo dây phun khi lá lúa còn ướt sương buổi sáng để tránh làm vi khuẩn lây lan. Khi bệnh mới chớm, rút bớt nước ruộng cho thoáng, ngừng bón đạm và phun các thuốc trừ vi khuẩn sinh học hoặc hoạt chất được phép (Streptomycin, Oxolinic acid, gốc đồng/kẽm sinh học theo khuyến cáo BVTV).',
    references:
      'LSU AgCenter / Bugwood Network (Donald Groth); Cục Bảo vệ Thực vật; IRRI Rice Knowledge Bank.',
    verificationStatus: 'verified',
    verifiedBy: 'Viện Bảo vệ Thực vật (VAAS) & IRRI',
    standardCode: 'QCVN 01-166:2014/BNNPTNT; TCVN 13268-1:2021',
    reviewDate: '2026-11-26',
    sampleImageUrl: '/images/rice_bacterial_blight.jpg',
    imageSource: 'Ảnh thực tế: Donald Groth, LSU AgCenter / Bugwood 5390468 (Wikimedia Commons)',
    imageSourceUrl: 'https://commons.wikimedia.org/wiki/File:Bacterial_blight_of_rice.jpeg',
    createdAt: '2026-01-12T00:00:00.000Z',
    updatedAt: '2026-11-26T22:15:00.000Z',
  },
  {
    id: 'rice_sheath_blight',
    cropType: 'rice',
    vietnameseName: 'Bệnh Khô vằn lúa (Đốm vằn da hổ)',
    englishName: 'Rice Sheath Blight',
    symptoms:
      'Vết bệnh xuất hiện ở bẹ lá gần mặt nước ruộng, tạo mảng loang lổ giống vân mây hay da hổ, tâm màu xám trắng hoặc xanh xám, viền nâu đậm rõ nét. Bệnh bò dần lên bẹ trên và lá đòng, xuất hiện các hạch nấm màu nâu nhỏ bám ngoài bẹ, làm cây lúa yếu dễ đổ ngã và lép hạt.',
    affectedPlantParts: ['stem', 'leaf'],
    causes:
      'Nấm Rhizoctonia solani. Hạch nấm tồn tại rất lâu trong đất và rơm rạ, nổi trên mặt nước ruộng để bám vào bẹ lúa.',
    favorableConditions:
      'Thời tiết nóng ẩm (28-32°C), ruộng cấy dày rậm rạp, bón thừa phân đạm làm tán lúa bít kín thiếu ánh sáng.',
    preventionMethods:
      'Cày ải phơi đất, vớt sạch rơm rạ và hạch nấm nổi trên mặt nước trước khi cấy. Áp dụng sạ hàng/cấy thưa vừa phải (3 giảm 3 tăng hoặc SRI) và bón phân cân đối.',
    safeManagement:
      'Tháo cạn nước phơi ruộng vài ngày để hạ ẩm độ vùng gốc lúa. Khi tỷ lệ dảnh bệnh vượt ngưỡng ở giai đoạn làm đòng – trỗ, phun tập trung vào phần gốc thân bẹ bằng hoạt chất sinh học Validamycin hoặc chế phẩm nấm đối kháng (Chaetomium spp., Trichoderma spp.) hay thuốc đặc trị được phép theo nguyên tắc 4 đúng.',
    references:
      'USDA Agricultural Research Service (Peggy Greb); Viện Khoa học Nông nghiệp Việt Nam (VAAS); Cục BVTV.',
    verificationStatus: 'verified',
    verifiedBy: 'Viện Khoa học Nông nghiệp Việt Nam (VAAS) & USDA ARS',
    standardCode: 'QCVN 01-166:2014/BNNPTNT; TCVN 13268-1:2021',
    reviewDate: '2026-11-26',
    sampleImageUrl: '/images/rice_sheath_blight.jpg',
    imageSource: 'Ảnh thực tế: Peggy Greb, USDA Agricultural Research Service (Wikimedia Commons)',
    imageSourceUrl: 'https://commons.wikimedia.org/wiki/File:RiceSheathArk.jpg',
    createdAt: '2026-01-14T00:00:00.000Z',
    updatedAt: '2026-11-26T22:15:00.000Z',
  },
  {
    id: 'rice_brown_spot',
    cropType: 'rice',
    vietnameseName: 'Bệnh Đốm nâu lúa (Tiêm lửa)',
    englishName: 'Rice Brown Spot',
    symptoms:
      'Trên phiến lá có nhiều đốm tròn hoặc hình bầu dục kích thước cỡ hạt vừng (hạt mè), màu nâu sẫm đến nâu đen, KHÔNG nhọn hai đầu như bệnh đạo ôn. Vết lớn có tâm màu xám nâu nhạt và viền vàng nhạt xung quanh. Nặng làm lá vàng khô sớm và gây đen vỏ trấu hạt lúa.',
    affectedPlantParts: ['leaf', 'fruit'],
    causes:
      'Nấm Bipolaris oryzae (tên hữu tính Cochliobolus miyabeanus). Bệnh thường bùng phát mạnh trên ruộng lúa suy dinh dưỡng (thiếu Kali, Silic, Đạm) hoặc đất chua phèn, đất cát bạc màu.',
    favorableConditions:
      'Đất cát pha nghèo hữu cơ vùng duyên hải miền Trung, đất phèn nhẹ hoặc ruộng bị khô hạn thiếu nước kéo dài xen kẽ sương đêm ẩm.',
    preventionMethods:
      'Cải tạo đất bằng phân chuồng hoai mục, bón vôi khử chua và bổ sung cân đối Kali, Lân, Silic ngay từ đầu vụ. Xử lý hạt giống bằng nước ấm 54°C (3 sôi 2 lạnh) trước khi ngâm ủ.',
    safeManagement:
      'Điều tiết giữ nước đều, tránh để ruộng nứt nẻ khô hạn. Khi thấy bệnh xuất hiện nhiều trên ruộng thiếu chất, kết hợp bón bổ sung phân Kali/phân bón lá vi lượng để cây hồi sức, trường hợp nặng mới phun thuốc trừ nấm được phép theo hướng dẫn cán bộ khuyến nông.',
    references:
      'IRRI Standard Evaluation System for Rice (SES); LSU AgCenter (Donald Groth); Viện BVTV.',
    verificationStatus: 'verified',
    verifiedBy: 'Viện Nghiên cứu Lúa Quốc tế (IRRI) & LSU AgCenter',
    standardCode: 'QCVN 01-166:2014/BNNPTNT; IRRI Standard Evaluation System (SES)',
    reviewDate: '2026-11-26',
    sampleImageUrl: '/images/rice_brown_spot.jpg',
    imageSource: 'Ảnh thực tế: Donald Groth, LSU AgCenter (Wikimedia Commons)',
    imageSourceUrl: 'https://commons.wikimedia.org/wiki/File:Cochliobolus_miyabeanus.jpg',
    createdAt: '2026-01-18T00:00:00.000Z',
    updatedAt: '2026-11-26T22:15:00.000Z',
  },
  {
    id: 'rice_brown_planthopper',
    cropType: 'rice',
    vietnameseName: 'Rầy nâu hại lúa (Gây cháy rầy)',
    englishName: 'Rice Brown Planthopper (Nilaparvata lugens)',
    symptoms:
      'Rầy trưởng thành và rầy cám màu nâu, tụ tập dày đặc ở phần bẹ thân lúa sát mặt nước để chích hút nhựa. Mật độ cao làm cả chòm lúa vàng khô cháy rụi từ gốc lên (cháy rầy từng đám tròn). Ngoài ra rầy nâu là môi giới truyền bệnh virus Vàng lùn và Lùn xoắn lá nguy hiểm.',
    affectedPlantParts: ['stem', 'other'],
    causes:
      'Côn trùng chích hút Nilaparvata lugens. Bùng phát mạnh khi ruộng bón thừa đạm, cấy quá dày và phun thuốc trừ sâu phổ rộng sớm đầu vụ làm chết thiên địch.',
    favorableConditions:
      'Thời tiết nắng nóng xen mưa giông, giai đoạn lúa đẻ nhánh rộ đến trỗ chín sữa.',
    preventionMethods:
      'Sạ cấy thưa hợp lý, áp dụng "1 phải 5 giảm" / "3 giảm 3 tăng", giữ mực nước ruộng thích hợp. Không phun thuốc trừ sâu bừa bãi trong 40 ngày đầu sau sạ để bảo vệ nhện, bọ xít mù xanh và ong ký sinh.',
    safeManagement:
      'Khi kiểm tra gốc lúa thấy mật độ rầy cao vượt ngưỡng (từ 2-3 con/dảnh trở lên ở giai đoạn đòng - trỗ): dâng nước ruộng cao để rầy bò lên cao rồi phun thuốc đặc trị chọn lọc ít hại thiên địch hoặc chế phẩm nấm xanh Metarhizium anisopliae hướng vòi phun vào sát gốc thân lúa.',
    references:
      'Cục Bảo vệ Thực vật; Viện Lúa ĐBSCL; Bugwood Network (UGA5190055).',
    verificationStatus: 'verified',
    verifiedBy: 'Cục Bảo vệ Thực vật & Viện Nghiên cứu Lúa Quốc tế (IRRI)',
    standardCode: 'QCVN 01-166:2014/BNNPTNT; TCVN 13268-1:2021',
    reviewDate: '2026-11-26',
    sampleImageUrl: '/images/rice_brown_planthopper.jpg',
    imageSource: 'Ảnh thực tế: Natasha Wright, FDACS / Bugwood UGA5190055 (Wikimedia Commons)',
    imageSourceUrl: 'https://commons.wikimedia.org/wiki/File:Nilaparvata_lugens_-_Brown_planthopper_-_UGA5190055.jpg',
    createdAt: '2026-02-05T00:00:00.000Z',
    updatedAt: '2026-11-26T22:15:00.000Z',
  },
  {
    id: 'rice_false_smut',
    cropType: 'rice',
    vietnameseName: 'Bệnh Hoa cúc / Than đen hạt lúa',
    englishName: 'Rice False Smut (Ustilaginoidea virens)',
    symptoms:
      'Trên bông lúa đang trỗ hoặc chín sữa xuất hiện những hạt lúa bị biến dạng phình to gấp nhiều lần bình thường thành khối u tròn mịn màu vàng cam rực rồi chuyển xanh ô-liu đến đen lục (nhìn giống bông hoa cúc hoặc cục phấn mốc bám trên hạt).',
    affectedPlantParts: ['fruit'],
    causes:
      'Nấm Ustilaginoidea virens (Villosiclava virens) xâm nhập vào hoa lúa đúng lúc lúa đang trỗ phơi màu.',
    favorableConditions:
      'Mưa nhiều, ẩm độ cao, sương mù trùng đúng giai đoạn lúa trỗ bông kết hợp ruộng bón thừa đạm hoặc cấy giống lúa lai dễ nhiễm.',
    preventionMethods:
      'Không sử dụng hạt giống từ ruộng bị bệnh nặng. Bón phân cân đối, không bón đạm muộn lúc lúa sắp trỗ. Vệ sinh tàn dư rơm rạ sau thu hoạch.',
    safeManagement:
      'Thu hái tiêu hủy các bông lúa mới chớm có u nấm sớm trước khi bào tử bung phát tán. Ở những vùng thường xuyên bị bệnh hoa cúc trên lúa lai, phun phòng bằng thuốc gốc đồng hoặc thuốc trừ nấm được phép vào giai đoạn lúa sắp trỗ (ôm đòng) và sau trỗ đều.',
    references:
      'Viện Bảo vệ Thực vật (VAAS); IRRI Rice Knowledge Bank; Wikimedia Commons.',
    verificationStatus: 'verified',
    verifiedBy: 'Viện Bảo vệ Thực vật Việt Nam & IRRI',
    standardCode: 'QCVN 01-166:2014/BNNPTNT; TCVN 13268-1:2021',
    reviewDate: '2026-11-26',
    sampleImageUrl: '/images/rice_false_smut.jpg',
    imageSource: 'Ảnh thực tế: Hạt lúa nhiễm bệnh hoa cúc / than đen (Wikimedia Commons)',
    imageSourceUrl: 'https://commons.wikimedia.org/wiki/File:Rice_false_smut.jpg',
    createdAt: '2026-02-06T00:00:00.000Z',
    updatedAt: '2026-11-26T22:15:00.000Z',
  },
  {
    id: 'rice_leaf_folder',
    cropType: 'rice',
    vietnameseName: 'Sâu cuốn lá nhỏ hại lúa',
    englishName: 'Rice Leaf Folder (Cnaphalocrocis medinalis)',
    symptoms:
      'Sâu non màu xanh lục nhạt dùng tơ trắng khâu hai mép lá lúa cuộn tròn thành ống dọc theo chiều dài lá, rồi nằm bên trong cạo ăn hết phần chất xanh chỉ chừa lại lớp biểu bì trắng đục. Ruộng bị hại nặng nhìn từ xa xơ xác trắng bạc.',
    affectedPlantParts: ['leaf'],
    causes:
      'Sâu non của bướm ngài nhỏ Cnaphalocrocis medinalis. Bướm cái thích đẻ trứng lên những ruộng lúa xanh tốt thừa đạm.',
    favorableConditions:
      'Thời tiết mát ẩm, nhiều mây xen nắng nhẹ ở giai đoạn lúa đẻ nhánh rộ và làm đòng.',
    preventionMethods:
      'Cấy mật độ vừa phải, bón phân cân đối không để lúa quá tốt lốp. Bảo vệ ong ký sinh và bọ cánh cứng ăn thịt.',
    safeManagement:
      'Ở giai đoạn đẻ nhánh cây lúa có khả năng đền bù rất tốt nên không cần phun thuốc vội khi tỷ lệ lá cuốn thấp. Chỉ phun phòng trừ ở giai đoạn giữ lá đòng (làm đòng - trỗ) khi sâu non tuổi 1-2 mới nở vượt ngưỡng bằng chế phẩm sinh học (Bt - Bacillus thuringiensis, Abamectin) hoặc thuốc đặc trị theo khuyến cáo BVTV.',
    references:
      'Cục Bảo vệ Thực vật; Viện Lúa ĐBSCL; Wikimedia Commons (Cnaphalocrocis medinalis).',
    verificationStatus: 'verified',
    verifiedBy: 'Cục Bảo vệ Thực vật Việt Nam',
    standardCode: 'QCVN 01-166:2014/BNNPTNT; TCVN 13268-1:2021',
    reviewDate: '2026-11-26',
    sampleImageUrl: '/images/rice_leaf_folder.jpg',
    imageSource: 'Ảnh thực tế: Sâu cuốn lá nhỏ khâu tơ trong lá lúa (Wikimedia Commons)',
    imageSourceUrl: 'https://commons.wikimedia.org/wiki/File:Rice_leaf_folder.jpg',
    createdAt: '2026-02-07T00:00:00.000Z',
    updatedAt: '2026-11-26T22:15:00.000Z',
  },
  {
    id: 'rice_tungro',
    cropType: 'rice',
    vietnameseName: 'Bệnh Vàng lùn / Tungro hại lúa',
    englishName: 'Rice Tungro / Yellow-Orange Leaf Virus',
    symptoms:
      'Khóm lúa lùn thấp hẳn so với cây khỏe xung quanh, đẻ nhánh ít, lá lúa chuyển màu vàng cam hoặc vàng rực từ chóp lá lan xuống và hơi xoắn vặn. Cây nhiễm sớm thường không trỗ được hoặc trỗ nghẹn, hạt lép lửng.',
    affectedPlantParts: ['other', 'leaf'],
    causes:
      'Virus gây bệnh truyền qua côn trùng môi giới rầy xanh đuôi đen (Nephotettix spp.) hoặc rầy nâu (với bệnh Vàng lùn - Lùn xoắn lá tại Việt Nam). Bệnh không lây qua hạt giống hay đất.',
    favorableConditions:
      'Gieo sạ không đồng loạt, bỏ qua khâu vệ sinh đồng ruộng giữa các vụ khiến rầy mang mầm bệnh từ lúa chét/cỏ dại bay sang mạ non.',
    preventionMethods:
      'Cày vùi rơm rạ, diệt sạch lúa chét và cỏ dại trước khi sạ ít nhất 2-3 tuần. Gieo sạ tập trung đồng loạt "né rầy" theo lịch khuyến nông địa phương.',
    safeManagement:
      'Bệnh do virus hiện CHƯA có thuốc chữa khỏi cây đã bệnh. Cần nhổ bỏ và vùi sâu ngay những khóm lúa mới chớm vàng lùn khi mật độ dưới 5-10% để cắt nguồn virus, kết hợp kiểm tra phòng trừ rầy môi giới trên ruộng để bảo vệ những khóm khỏe còn lại.',
    references:
      'IRRI Rice Knowledge Bank; JIRCAS Photo Archive; Cục Bảo vệ Thực vật.',
    verificationStatus: 'verified',
    verifiedBy: 'Viện Nghiên cứu Lúa Quốc tế (IRRI) & JIRCAS',
    standardCode: 'QCVN 01-140:2013/BNNPTNT; QCVN 01-166:2014/BNNPTNT',
    reviewDate: '2026-11-26',
    sampleImageUrl: '/images/rice_tungro.jpg',
    imageSource: 'Ảnh thực tế: Ruộng lúa vàng lùn Tungro (JIRCAS Photo Archive, Wikimedia Commons)',
    imageSourceUrl: 'https://commons.wikimedia.org/wiki/File:Rice_plants_affected_by_tungro_disease1.jpg',
    createdAt: '2026-02-08T00:00:00.000Z',
    updatedAt: '2026-11-26T22:15:00.000Z',
  },

  // --- PEANUT DISEASES & KEY PESTS (7) ---
  {
    id: 'peanut_leaf_spot',
    cropType: 'peanut',
    vietnameseName: 'Bệnh Đốm lá lạc (Đốm nâu sớm & Đốm đen muộn)',
    englishName: 'Peanut Early and Late Leaf Spot',
    symptoms:
      'Đốm nâu sớm: Vết tròn màu nâu đỏ ở mặt trên lá, có quầng vàng sáng rất rõ bao quanh. Đốm đen muộn: Vết tròn màu nâu sẫm đến đen tuyền rõ ở mặt dưới lá, quầng vàng mờ hoặc không có. Bệnh nặng làm các đốm dính liền nhau, lá vàng rụng hàng loạt từ gốc lên ngọn.',
    affectedPlantParts: ['leaf', 'stem'],
    causes:
      'Nấm Passalora arachidicola (đốm nâu sớm) và Nothopassalora personata (đốm đen muộn). Nguồn bệnh lưu tồn trong tàn dư thân lá lạc vụ trước.',
    favorableConditions:
      'Thời tiết ấm ẩm 24-28°C, mưa phùn, sương đêm đọng nước trên lá hoặc ruộng lạc đọng ẩm vụ Xuân và Thu Đông.',
    preventionMethods:
      'Luân canh lạc với lúa nước hoặc cây trồng khác họ đậu. Thu dọn sạch tàn dư cây sau thu hoạch. Chọn các giống lạc kháng bệnh tốt (như L14, L26) và lên luống thoát nước tốt.',
    safeManagement:
      'Bón phân cân đối kết hợp bón vôi lúc gieo và lúc lạc đâm tia tạo củ. Khi bệnh mới chớm trên lá tầng dưới, ngắt bỏ lá bệnh nặng và phun phòng bằng chế phẩm sinh học hoặc thuốc gốc đồng/Mancozeb/Difenoconazole đúng liều khuyến cáo và đảm bảo thời gian cách ly.',
    references:
      'ICRISAT Groundnut Disease Compendium; Viện Bảo vệ Thực vật (VAAS); Viện KHKT Nông nghiệp Bắc Trung Bộ.',
    verificationStatus: 'verified',
    verifiedBy: 'Viện Bảo vệ Thực vật & Viện KHKT Nông nghiệp Bắc Trung Bộ',
    standardCode: 'TCVN 13268-3:2021 (Phương pháp điều tra sinh vật gây hại cây công nghiệp)',
    reviewDate: '2026-11-26',
    sampleImageUrl: '/images/peanut_leaf_spot.jpg',
    imageSource: 'Ảnh mẫu chuẩn bệnh Đốm nâu lá lạc - Bộ tiêu chuẩn AgriVision AI',
    imageSourceUrl: 'https://commons.wikimedia.org/wiki/Category:Mycosphaerella_arachidis',
    createdAt: '2026-01-11T00:00:00.000Z',
    updatedAt: '2026-11-26T22:15:00.000Z',
  },
  {
    id: 'peanut_rust',
    cropType: 'peanut',
    vietnameseName: 'Bệnh Gỉ sắt lạc (Groundnut Rust)',
    englishName: 'Peanut Rust',
    symptoms:
      'Mặt dưới lá nổi lên rất nhiều mụn nhỏ li ti màu vàng cam đến nâu đỏ gạch (ổ bào tử nấm). Khi ổ mụn vỡ ra tạo lớp bột mịn màu nâu gỉ sắt dính vào ngón tay khi sờ. Khác với bệnh đốm lá làm rụng lá sớm, lá bị gỉ sắt thường khô cháy quăn lại nhưng vẫn bám dính trên cành.',
    affectedPlantParts: ['leaf', 'stem'],
    causes:
      'Nấm Puccinia arachidis. Bào tử hạ phát tán rất nhanh theo gió và nước mưa bắn từ ruộng này sang ruộng khác.',
    favorableConditions:
      'Nhiệt độ mát ấm 20-26°C kèm sương mù hoặc giọt nước đọng trên lá kéo dài trên 6 giờ, thường hại nặng từ giai đoạn lạc ra hoa đến chắc củ.',
    preventionMethods:
      'Gieo trồng mật độ vừa phải, làm cỏ thông thoáng luống lạc, tránh bón quá thừa đạm làm tán lá rậm rạp ẩm ướt.',
    safeManagement:
      'Thăm đồng kiểm tra kỹ mặt dưới lá từ sau khi lạc ra hoa. Khi ổ bào tử mới xuất hiện rải rác, phun sớm các chế phẩm lưu huỳnh nông nghiệp, gốc đồng hoặc thuốc trừ nấm gỉ sắt được phép sử dụng theo hướng dẫn cán bộ BVTV địa phương.',
    references:
      'ICRISAT Peanut Disease Compendium; Wikimedia Commons (Puccinia arachidis); Viện BVTV.',
    verificationStatus: 'verified',
    verifiedBy: 'Viện Bảo vệ Thực vật & Viện ICRISAT',
    standardCode: 'TCVN 13268-3:2021; ICRISAT Groundnut Rust Compendium',
    reviewDate: '2026-11-26',
    sampleImageUrl: '/images/peanut_rust.jpg',
    imageSource: 'Ảnh thực tế: Mặt dưới lá lạc bị bệnh gỉ sắt (Wikimedia Commons / ICRISAT)',
    imageSourceUrl: 'https://commons.wikimedia.org/wiki/File:Puccinia_arachidis2.jpg',
    createdAt: '2026-01-16T00:00:00.000Z',
    updatedAt: '2026-11-26T22:15:00.000Z',
  },
  {
    id: 'peanut_stem_rot',
    cropType: 'peanut',
    vietnameseName: 'Bệnh Thối trắng thân / Héo rũ gốc mốc trắng',
    englishName: 'Peanut Stem Rot / Southern Blight / White Mold',
    symptoms:
      'Phần cổ rễ và gốc thân sát mặt đất bị thối nâu mềm, bao quanh bởi lớp sợi nấm trắng muốt như bông. Trên lớp sợi nấm trắng hình thành nhiều hạt nhỏ tròn cỡ hạt cải, lúc đầu màu trắng sau chuyển vàng nâu đến nâu sẫm (hạch nấm). Cây lạc héo rũ gục rất nhanh dù lá vẫn còn xanh.',
    affectedPlantParts: ['stem', 'other'],
    causes:
      'Nấm đất Agroathelia rolfsii (tên cũ Sclerotium rolfsii / Athelia rolfsii). Hạch nấm sống dai dẳng trong đất nhiều năm và lây theo nước tưới, đất dính dụng cụ.',
    favorableConditions:
      'Nhiệt độ cao 28-35°C kết hợp đất ẩm ướt sau mưa rào nắng gắt hoặc luống thấp úng nước trên đất cát pha.',
    preventionMethods:
      'Cày sâu lật đất chôn vùi hạch nấm, luân canh với lúa nước. Lên luống cao rãnh sâu thoát nước tốt. Bón lót phân chuồng hoai mục ủ nấm đối kháng Trichoderma và bón vôi bột (khoảng 25-30 kg/sào Trung Bộ 500 m²) để nâng pH đất.',
    safeManagement:
      'Nhổ bỏ ngay cả cây bệnh và lớp đất quanh gốc cho vào túi kín mang ra khỏi ruộng tiêu hủy (tránh làm rơi hạch nấm xuống đất). Rắc vôi bột vào hốc vừa nhổ và tưới chế phẩm sinh học Trichoderma harzianum hoặc Bacillus subtilis vào các khóm xung quanh để khoanh vùng.',
    references:
      'ICRISAT; Trường Đại học Nông Lâm Huế; Viện Bảo vệ Thực vật (VAAS).',
    verificationStatus: 'verified',
    verifiedBy: 'Khoa Nông học - ĐH Nông Lâm Huế & Viện BVTV',
    standardCode: 'TCVN 13268-3:2021 (Điều tra sinh vật gây hại cây công nghiệp)',
    reviewDate: '2026-11-26',
    sampleImageUrl: '/images/peanut_stem_rot.jpg',
    imageSource: 'Ảnh thực tế: Sợi nấm trắng & hạch nấm gốc lạc (Wikimedia Commons)',
    imageSourceUrl: 'https://commons.wikimedia.org/wiki/File:White-mycelial-growth-of-Sclerotium-rolfsii-on-crown-of-peanut-plant-with-sclerotia-forming-on-infected-tissue.jpg',
    createdAt: '2026-01-22T00:00:00.000Z',
    updatedAt: '2026-11-26T22:15:00.000Z',
  },
  {
    id: 'peanut_bacterial_wilt',
    cropType: 'peanut',
    vietnameseName: 'Bệnh Héo xanh vi khuẩn hại lạc (Chết ẻo)',
    englishName: 'Peanut Bacterial Wilt (Ralstonia solanacearum)',
    symptoms:
      'Cây lạc đột ngột héo rũ vào ban ngày rồi chết gục trong khi lá vẫn giữ màu xanh xám (không có sợi nấm trắng như bệnh mốc trắng). Khi chẻ dọc thân gốc thấy mạch dẫn bên trong hóa nâu sẫm; cắt đoạn thân ngâm vào cốc nước trong sẽ thấy dòng dịch vi khuẩn trắng đục như khói sữa chảy ra.',
    affectedPlantParts: ['stem', 'other'],
    causes:
      'Vi khuẩn đất Ralstonia solanacearum sống rất lâu trong đất và lây qua nước tưới, vết thương rễ do tuyến trùng hoặc làm cỏ.',
    favorableConditions:
      'Đất cát pha trồng lạc liên canh nhiều vụ, nhiệt độ cao 28-35°C kèm mưa nắng xen kẽ, đất đọng ẩm.',
    preventionMethods:
      'Luân canh bắt buộc lạc với lúa nước hoặc ngô/cây họ hòa thảo 2-3 vụ. Trồng giống lạc chống chịu khá (như L14, L23). Bón vôi khử chua đất trước khi gieo.',
    safeManagement:
      'Nhổ bỏ tiêu hủy ngay các khóm lạc bị héo xanh ra khỏi ruộng, rắc vôi bột vào hốc vừa nhổ để khử khuẩn. Không tưới tràn từ ruộng bệnh sang ruộng khỏe; có thể tưới phòng vùng gốc cây lân cận bằng chế phẩm vi sinh đối kháng Bacillus subtilis hoặc Pseudomonas fluorescens.',
    references:
      'ICRISAT; Viện Bảo vệ Thực vật (VAAS); USDA / Bugwood Network (Ralstonia solanacearum).',
    verificationStatus: 'verified',
    verifiedBy: 'Viện Bảo vệ Thực vật Việt Nam & ICRISAT',
    standardCode: 'TCVN 13268-3:2021 (Điều tra sinh vật gây hại cây công nghiệp)',
    reviewDate: '2026-11-26',
    sampleImageUrl: '/images/peanut_bacterial_wilt.jpg',
    imageSource: 'Ảnh thực tế: Mạch dẫn thân bị thâm nâu do vi khuẩn Ralstonia (USDA / Bugwood, Wikimedia Commons)',
    imageSourceUrl: 'https://commons.wikimedia.org/wiki/File:Ralstonia_solanacearum_symptoms.jpg',
    createdAt: '2026-02-09T00:00:00.000Z',
    updatedAt: '2026-11-26T22:15:00.000Z',
  },
  {
    id: 'peanut_aspergillus_crown_rot',
    cropType: 'peanut',
    vietnameseName: 'Bệnh Thối đen cổ rễ lạc (Chết cây con & Mốc đen củ)',
    englishName: 'Peanut Aspergillus Crown Rot (Aspergillus niger)',
    symptoms:
      'Cây lạc con hoặc cây đang phát triển bị thối nhũn vùng cổ rễ sát đất rồi đổ gục chết từng khóm rải rác giữa ruộng. Trên cổ rễ bị thối và trên vỏ củ lạc có lớp bột bào tử màu ĐEN TUYỀN (khác với sợi nấm trắng của bệnh thối trắng thân).',
    affectedPlantParts: ['stem', 'fruit', 'other'],
    causes:
      'Nấm Aspergillus niger tồn tại trên vỏ hạt giống và trong đất khô nóng.',
    favorableConditions:
      'Thời tiết nắng nóng khô hạn xen kẽ mưa ẩm lúc cây con mới mọc hoặc đất cát nóng làm cháy sém cổ rễ tạo điều kiện cho nấm xâm nhập.',
    preventionMethods:
      'Chọn hạt giống lạc chắc khỏe, phơi khô bảo quản tốt (không lấy hạt mốc). Làm đất tơi xốp, giữ ẩm đều lúc mới gieo, không bón phân đạm/phân chuồng tươi sát hạt.',
    safeManagement:
      'Nhổ bỏ cây chết đen cổ rễ để tránh lây lan bào tử đen; trộn hạt giống với chế phẩm nấm đối kháng Trichoderma trước khi gieo hoặc tưới bổ sung Trichoderma vào gốc khi mới phát hiện bệnh rải rác.',
    references:
      'ICRISAT; Bugwood Network (5356952); Viện Bảo vệ Thực vật Việt Nam.',
    verificationStatus: 'verified',
    verifiedBy: 'Viện ICRISAT & Bugwood Network',
    standardCode: 'TCVN 13268-3:2021; ICRISAT Groundnut Compendium',
    reviewDate: '2026-11-26',
    sampleImageUrl: '/images/peanut_aspergillus.jpg',
    imageSource: 'Ảnh thực tế: Cây lạc chết thối cổ rễ Aspergillus giữa luống (Bugwood 5356952, Wikimedia Commons)',
    imageSourceUrl: 'https://commons.wikimedia.org/wiki/File:Asperillus_infected_Peanut.jpg',
    createdAt: '2026-02-10T00:00:00.000Z',
    updatedAt: '2026-11-26T22:15:00.000Z',
  },
  {
    id: 'peanut_aphid',
    cropType: 'peanut',
    vietnameseName: 'Rệp muội đen hại lạc',
    englishName: 'Cowpea / Groundnut Aphid (Aphis craccivora)',
    symptoms:
      'Rệp nhỏ màu đen bóng hoặc nâu sẫm bám thành từng đám dày đặc ở ngọn non, mặt dưới lá non, cuống hoa và tia củ. Ngọn lạc bị chích hút xoăn quăn lại, còi cọc, cây chậm đâm tia; thường thấy nhiều kiến đen bò quanh đám rệp.',
    affectedPlantParts: ['leaf', 'stem'],
    causes:
      'Rệp muội Aphis craccivora. Ngoài hút nhựa làm suy cây, rệp muội còn truyền bệnh virus khảm lá/chùn ngọn trên cây lạc.',
    favorableConditions:
      'Thời tiết ấm hanh khô hoặc đầu vụ Xuân và vụ Thu khi cây lạc đang ra ngọn non và ra hoa.',
    preventionMethods:
      'Gieo đúng thời vụ, làm sạch cỏ dại ký chủ quanh bờ ruộng, tưới phun giữ ẩm vừa đủ khi trời khô hanh và bảo vệ bọ rùa đỏ ăn rệp.',
    safeManagement:
      'Khi mới xuất hiện ở vài khóm đầu bờ, có thể ngắt bỏ ngọn nhiều rệp tiêu hủy hoặc phun dầu khoáng nông nghiệp / chế phẩm sinh học (nấm trắng Beauveria, nước tỏi ớt gừng sinh học). Nếu rệp lan rộng trên ruộng, phun thuốc trừ rệp chọn lọc theo hướng dẫn BVTV.',
    references:
      'ICRISAT; Viện Bảo vệ Thực vật (VAAS); Wikimedia Commons (Aphis craccivora).',
    verificationStatus: 'verified',
    verifiedBy: 'Viện Bảo vệ Thực vật Việt Nam',
    standardCode: 'TCVN 13268-3:2021 (Điều tra dịch hại cây công nghiệp)',
    reviewDate: '2026-11-26',
    sampleImageUrl: '/images/peanut_aphid.jpg',
    imageSource: 'Ảnh thực tế: Rệp muội đen Aphis craccivora bám dày trên thân non (Wikimedia Commons)',
    imageSourceUrl: 'https://commons.wikimedia.org/wiki/File:Aphis_craccivora.jpg',
    createdAt: '2026-02-11T00:00:00.000Z',
    updatedAt: '2026-11-26T22:15:00.000Z',
  },
  {
    id: 'peanut_spodoptera',
    cropType: 'peanut',
    vietnameseName: 'Sâu khoang (Sâu ăn tạp) hại lá lạc',
    englishName: 'Tobacco Cutworm / Armyworm (Spodoptera litura)',
    symptoms:
      'Sâu non mới nở sống tập trung gặm lớp biểu bì làm lá lạc trắng mỏng như màng lụa. Sâu lớn có màu xám nâu hoặc xanh sẫm với các khoang đốm đen tam giác dọc hai bên lưng, cắn khuyết rách nát lá lạc, cắn đứt ngọn non và hoa.',
    affectedPlantParts: ['leaf', 'stem'],
    causes:
      'Sâu non của loài ngài đêm Spodoptera litura. Ban ngày sâu lớn thường trốn dưới tàn dư lá hoặc khe đất quanh gốc, ban đêm bò lên ăn lá.',
    favorableConditions:
      'Thời tiết ấm nóng ẩm xen kẽ từ giai đoạn lạc phân cành đến làm củ.',
    preventionMethods:
      'Cày phơi ải đất diệt nhộng; thăm đồng tìm ngắt các ổ trứng có lớp lông tơ vàng nâu ở mặt dưới lá và bắt sâu mới nở tụ tập trên lá.',
    safeManagement:
      'Phun chế phẩm vi sinh Bt (Bacillus thuringiensis) hoặc virus NPV trừ sâu khoang vào chiều mát lúc sâu tuổi 1-2 mới nở cho hiệu quả cao và an toàn cho đất và thiên địch. Tránh phun thuốc hóa học độc hại gần kỳ thu hoạch.',
    references:
      'Cục Bảo vệ Thực vật; Viện Bảo vệ Thực vật (VAAS); Wikimedia Commons (Spodoptera litura).',
    verificationStatus: 'verified',
    verifiedBy: 'Cục Bảo vệ Thực vật Việt Nam',
    standardCode: 'TCVN 13268-3:2021 (Điều tra sinh vật gây hại cây công nghiệp)',
    reviewDate: '2026-11-26',
    sampleImageUrl: '/images/peanut_spodoptera.jpg',
    imageSource: 'Ảnh thực tế: Sâu khoang Spodoptera litura với dải đốm đen đặc trưng (Wikimedia Commons)',
    imageSourceUrl: 'https://commons.wikimedia.org/wiki/File:Spodoptera_litura_larva_L.jpg',
    createdAt: '2026-02-12T00:00:00.000Z',
    updatedAt: '2026-11-26T22:15:00.000Z',
  },
];
