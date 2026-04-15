# TCGdex API Reference - Single Source of Truth

**Vai trò:** Principal API Engineer & Technical Writer
**Mục đích:** Tài liệu này quy định các tiêu chuẩn dữ liệu, luồng fetch/cache và logic nghiệp vụ liên quan đến TCGdex API. Mọi AI và kỹ sư tham gia dự án BẮT BUỘC phải tuân thủ tài liệu này.

---

## 1. Phân tích Hiện trạng API trong Dự án

### Các File Chịu trách nhiệm API
| File | Vai trò |
| :--- | :--- |
| [apiService.ts](file:///f:/Phatnt-sources/tcg-cards-shop-webpage/src/services/apiService.ts) | Wrapper trung tâm. Xử lý logic fetch/fallback (SDK/HTTP) và cache tầng thấp (Map). |
| [tcgdexService.ts](file:///f:/Phatnt-sources/tcg-cards-shop-webpage/src/services/tcgdexService.ts) | Interface trực tiếp với `@tcgdex/sdk`. |
| [apiStore.ts](file:///f:/Phatnt-sources/tcg-cards-shop-webpage/src/features/inventory/store/apiStore.ts) | Quản lý state Pinia, persist card cache vào LocalStorage. |
| [apiConfig.ts](file:///f:/Phatnt-sources/tcg-cards-shop-webpage/src/features/inventory/config/apiConfig.ts) | Cấu hình Endpoints và Timeout. |

### Luồng Xử lý Dữ liệu (Data Pipeline)
1. **Fetch**: Ưu tiên gọi SDK (`getSet`, `getCard`). Nếu thất bại/không hỗ trợ, fallback về HTTP Request qua Proxy.
2. **Transform**: Dữ liệu thô từ API được lọc và chuẩn hóa thành các Schema quy định ở Mục 4.
3. **Cache**:
   - Tầng 1: In-memory Map trong `apiService`.
   - Tầng 2: `setCardsCache` trong Pinia.
   - Tầng 3: Persist nguyên JSON vào LocalStorage `tcg-shop-api-cache`.
4. **UI Render (Gacha/Shop)**: 
   - **Lazy Loading**: Khi mở Card, UI phải lật ngay lập tức. Nếu hình ảnh chưa tải xong, hiển thị **Loading Spinner** hoặc Skeleton.
   - **Async Fetch**: Việc fetch detail card (Price, Stats) diễn ra song song với animation xé pack.

---

## 2. Từ điển Dữ liệu Tĩnh (Static Constants)
Tuyệt đối không gọi API để lấy các danh sách này. Sử dụng các mảng dưới đây làm bộ lọc hoặc hằng số.

### Stages (Giai đoạn tiến hóa)
`BREAK`, `Basic`, `LEVEL-UP`, `MEGA`, `RESTORED`, `Stage1`, `Stage2`, `V-UNION`, `VMAX`, `VSTAR`.

### Types (Hệ thẻ bài)
`Colorless`, `Darkness`, `Dragon`, `Fairy`, `Fighting`, `Fire`, `Grass`, `Lightning`, `Metal`, `Psychic`, `Water`.

### Rarities (Độ hiếm tiêu chuẩn)
`ACE SPEC Rare`, `Amazing Rare`, `Black White Rare`, `Classic Collection`, `Common`, `Crown`, `Double rare`, `Four Diamond`, `Full Art Trainer`, `Holo Rare`, `Holo Rare V`, `Holo Rare VMAX`, `Holo Rare VSTAR`, `Hyper rare`, `Illustration rare`, `LEGEND`, `Mega Hyper Rare`, `None`, `One Diamond`, `One Shiny`, `One Star`, `Radiant Rare`, `Rare`, `Rare Holo`, `Rare Holo LV.X`, `Rare PRIME`, `Secret Rare`, `Shiny Ultra Rare`, `Shiny rare`, `Shiny rare V`, `Shiny rare VMAX`, `Special illustration rare`, `Three Diamond`, `Three Star`, `Two Diamond`, `Two Shiny`, `Two Star`, `Ultra Rare`, `Uncommon`.

---

## 3. Logic Hàng Hóa & Tiến trình (Shop Progression)

### Quy tắc Đóng gói (Packaging Rules)
- **1 Booster Box = 64 Booster Packs.**
- Người chơi có thể nhập Box nguyên (tốn dung lượng kho lớn hơn) hoặc 'Xé Box' (Unbox) để lấy 64 pack lẻ bán trên kệ hoặc tự mở Gacha.

### Lộ trình Mở khóa Shop (Generation Unlocking)
Dựa vào `serie.id` của TCGdex để mở khóa các mặt hàng theo cấp độ người chơi:

| Generation / Series ID | Player Level |
| :--- | :--- |
| `base`, `gym`, `neo`, `lc`, `ecard` | Level 1-10 |
| `ex` | Level 11-20 |
| `dp`, `pl`, `hgss`, `col` | Level 21-30 |
| `bw` | Level 31-40 |
| `xy` | Level 41-50 |
| `sm` | Level 51-60 |
| `swsh` | Level 61-70 |
| `sv` | Level 71-80 |
| `tcgp`, `me`, `misc`, `pop`, `tk`, `mc` | Level 80+ |

---

## 4. Cấu trúc Đối tượng (Validated Schemas)

### Card Object Interface
```typescript
interface TcgCard {
  id: string;               // ID duy nhất (vd: 'swsh1-1')
  localId: string;          // Số thứ tự trong set
  name: string;             // Tên thẻ bài
  image: string;            // URL ảnh (ưu tiên /high.webp)
  category: string;         // Pokemon, Trainer, Energy
  illustrator?: string;
  rarity: string;
  hp?: number;
  types?: string[];
  stage?: string;
  evolveFrom?: string;
  attacks?: Array<{
    cost: string[];
    name: string;
    effect?: string;
    damage?: string | number;
  }>;
  weaknesses?: Array<{
    type: string;
    value: string;
  }>;
  retreat?: number;
  pricing?: {               // Lấy từ pricing.tcgplayer.normal
    marketPrice: number;    // Nếu null, dùng midPrice hoặc random theo Rarity
    lowPrice?: number;
    midPrice?: number;
  };
}
```

### Pricing Logic cho Shop
- **Giá Nhập Box/Pack**: 
  - Giá Pack = sum(marketPrice của các card trong set trung bình) / hệ số (mặc định set giá dựa trên rarity distribution của set).
  - Giá Box = (Giá Pack * 64) * 0.85 (Chiết khấu sỉ).
- **Giá Bán**: Tùy thuộc vào Level Shop và độ hot của Series.

---
> **Lưu ý:** Mọi chỉnh sửa Luồng API phải được cập nhật vào file này trước khi triển khai code thực tế.



GENERATION I

Base Set 2 Booster Pack

Base Set Booster Pack

Fossil Booster Pack

Jungle Booster Pack

Team Rocket Booster Pack

Wizards Black Star Promos Booster Pack

Base Set 2 Booster Box (64 Packs)

Base Set Booster Box (64 Packs)

Fossil Booster Box (64 Packs)

Jungle Booster Box (64 Packs)

Team Rocket Booster Box (64 Packs)

Wizards Black Star Promos Booster Box (64 Packs)
GENERATION III

Crystal Guardians Booster Box (64 Packs)

Crystal Guardians Booster Pack

Delta Species Booster Box (64 Packs)

Delta Species Booster Pack

Deoxys Booster Box (64 Packs)

Deoxys Booster Pack

Dragon Booster Box (64 Packs)

Dragon Booster Pack

Dragon Frontiers Booster Box (64 Packs)

Dragon Frontiers Booster Pack

Emerald Booster Box (64 Packs)

Emerald Booster Pack

FireRed & LeafGreen Booster Box (64 Packs)

FireRed & LeafGreen Booster Pack

Hidden Legends Booster Box (64 Packs)

Hidden Legends Booster Pack

Holon Phantoms Booster Box (64 Packs)

Holon Phantoms Booster Pack

Legend Maker Booster Box (64 Packs)

Legend Maker Booster Pack

Poké Card Creator Pack Booster Box (64 Packs)

Poké Card Creator Pack Booster Pack

Power Keepers Booster Box (64 Packs)

Power Keepers Booster Pack

Ruby & Sapphire Booster Box (64 Packs)

Ruby & Sapphire Booster Pack

Sandstorm Booster Box (64 Packs)

Sandstorm Booster Pack

Team Magma vs Team Aqua Booster Box (64 Packs)

Team Magma vs Team Aqua Booster Pack

Team Rocket Returns Booster Box (64 Packs)

Team Rocket Returns Booster Pack

Unseen Forces Booster Box (64 Packs)

Unseen Forces Booster Pack

Unseen Forces Unown Collection Booster Box (64 Packs)

Unseen Forces Unown Collection Booster Pack
GENERATION IV

Diamond & Pearl Booster Box (64 Packs)

Diamond & Pearl Booster Pack

DP Black Star Promos Booster Box (64 Packs)

DP Black Star Promos Booster Pack

Great Encounters Booster Box (64 Packs)

Great Encounters Booster Pack

Legends Awakened Booster Box (64 Packs)

Legends Awakened Booster Pack

Majestic Dawn Booster Box (64 Packs)

Majestic Dawn Booster Pack

Mysterious Treasures Booster Box (64 Packs)

Mysterious Treasures Booster Pack

Secret Wonders Booster Box (64 Packs)

Secret Wonders Booster Pack

Stormfront Booster Box (64 Packs)

Stormfront Booster Pack
GENERATION V

Black & White Booster Box (64 Packs)

Black & White Booster Pack

Boundaries Crossed Booster Box (64 Packs)

Boundaries Crossed Booster Pack

BW Black Star Promos Booster Box (64 Packs)

BW Black Star Promos Booster Pack

Dark Explorers Booster Box (64 Packs)

Dark Explorers Booster Pack

Dragon Vault Booster Box (64 Packs)

Dragon Vault Booster Pack

Dragons Exalted Booster Box (64 Packs)

Dragons Exalted Booster Pack

Emerging Powers Booster Box (64 Packs)

Emerging Powers Booster Pack

Legendary Treasures Booster Box (64 Packs)

Legendary Treasures Booster Pack

Next Destinies Booster Box (64 Packs)

Next Destinies Booster Pack

Noble Victories Booster Box (64 Packs)

Noble Victories Booster Pack

Plasma Blast Booster Box (64 Packs)

Plasma Blast Booster Pack

Plasma Freeze Booster Box (64 Packs)

Plasma Freeze Booster Pack

Plasma Storm Booster Box (64 Packs)

Plasma Storm Booster Pack

Radiant Collection Booster Box (64 Packs)

Radiant Collection Booster Pack
GENERATION VI

Ancient Origins Booster Box (64 Packs)

Ancient Origins Booster Pack

BREAKpoint Booster Box (64 Packs)

BREAKpoint Booster Pack

BREAKthrough Booster Box (64 Packs)

BREAKthrough Booster Pack

Double Crisis Booster Box (64 Packs)

Double Crisis Booster Pack

Evolutions Booster Box (64 Packs)

Evolutions Booster Pack

Fates Collide Booster Box (64 Packs)

Fates Collide Booster Pack

Flashfire Booster Box (64 Packs)

Flashfire Booster Pack

Furious Fists Booster Box (64 Packs)

Furious Fists Booster Pack

Generations Booster Box (64 Packs)

Generations Booster Pack

Kalos Starter Set Booster Box (64 Packs)

Kalos Starter Set Booster Pack

Phantom Forces Booster Box (64 Packs)

Phantom Forces Booster Pack

Primal Clash Booster Box (64 Packs)

Primal Clash Booster Pack

Roaring Skies Booster Box (64 Packs)

Roaring Skies Booster Pack

Steam Siege Booster Box (64 Packs)

Steam Siege Booster Pack

XY Black Star Promos Booster Box (64 Packs)

XY Black Star Promos Booster Pack

XY Booster Box (64 Packs)

XY Booster Pack

Yellow A Alternate Booster Box (64 Packs)

Yellow A Alternate Booster Pack
GENERATION VII

Burning Shadows Booster Box (64 Packs)

Burning Shadows Booster Pack

Celestial Storm Booster Box (64 Packs)

Celestial Storm Booster Pack

Cosmic Eclipse Booster Box (64 Packs)

Cosmic Eclipse Booster Pack

Crimson Invasion Booster Box (64 Packs)

Crimson Invasion Booster Pack

Detective Pikachu Booster Box (64 Packs)

Detective Pikachu Booster Pack

Dragon Majesty Booster Box (64 Packs)

Dragon Majesty Booster Pack

Forbidden Light Booster Box (64 Packs)

Forbidden Light Booster Pack

Guardians Rising Booster Box (64 Packs)

Guardians Rising Booster Pack

Hidden Fates Booster Box (64 Packs)

Hidden Fates Booster Pack

Hidden Fates Shiny Vault Booster Box (64 Packs)

Hidden Fates Shiny Vault Booster Pack

Lost Thunder Booster Box (64 Packs)

Lost Thunder Booster Pack

Shining Legends Booster Box (64 Packs)

Shining Legends Booster Pack

SM Black Star Promos Booster Box (64 Packs)

SM Black Star Promos Booster Pack

Sun & Moon Booster Box (64 Packs)

Sun & Moon Booster Pack

Team Up Booster Box (64 Packs)

Team Up Booster Pack

Ultra Prism Booster Box (64 Packs)

Ultra Prism Booster Pack

Unbroken Bonds Booster Box (64 Packs)

Unbroken Bonds Booster Pack

Unified Minds Booster Box (64 Packs)

Unified Minds Booster Pack
GENERATION VIII

Astral Radiance Booster Box (64 Packs)

Astral Radiance Booster Pack

Battle Styles Booster Box (64 Packs)

Battle Styles Booster Pack

Brilliant Stars Booster Box (64 Packs)

Brilliant Stars Booster Pack

Celebrations Booster Box (64 Packs)

Celebrations Booster Pack

Champion's Path Booster Box (64 Packs)

Champion's Path Booster Pack

Chilling Reign Booster Box (64 Packs)

Chilling Reign Booster Pack

Crown Zenith Booster Box (64 Packs)

Crown Zenith Booster Pack

Darkness Ablaze Booster Box (64 Packs)

Darkness Ablaze Booster Pack

Evolving Skies Booster Box (64 Packs)

Evolving Skies Booster Pack

Fusion Strike Booster Box (64 Packs)

Fusion Strike Booster Pack

Lost Origin Booster Box (64 Packs)

Lost Origin Booster Pack

Pokémon Futsal 2020 Booster Box (64 Packs)

Pokémon Futsal 2020 Booster Pack

Pokémon GO Booster Box (64 Packs)

Pokémon GO Booster Pack

Rebel Clash Booster Box (64 Packs)

Rebel Clash Booster Pack

Shining Fates Booster Box (64 Packs)

Shining Fates Booster Pack

Silver Tempest Booster Box (64 Packs)

Silver Tempest Booster Pack

Sword & Shield Booster Box (64 Packs)

Sword & Shield Booster Pack

SWSH Black Star Promos Booster Box (64 Packs)

SWSH Black Star Promos Booster Pack

Vivid Voltage Booster Box (64 Packs)

Vivid Voltage Booster Pack
GENERATION IX

151 Booster Box (64 Packs)

151 Booster Pack

Black Bolt Booster Box (64 Packs)

Black Bolt Booster Pack

Destined Rivals Booster Box (64 Packs)

Destined Rivals Booster Pack

Journey Together Booster Box (64 Packs)

Journey Together Booster Pack

Obsidian Flames Booster Box (64 Packs)

Obsidian Flames Booster Pack

Paldea Evolved Booster Box (64 Packs)

Paldea Evolved Booster Pack

Paldean Fates Booster Box (64 Packs)

Paldean Fates Booster Pack

Paradox Rift Booster Box (64 Packs)

Paradox Rift Booster Pack

Prismatic Evolutions Booster Box (64 Packs)

Prismatic Evolutions Booster Pack

Scarlet & Violet Booster Box (64 Packs)

Scarlet & Violet Booster Pack

Scarlet & Violet Energy Booster Box (64 Packs)

Scarlet & Violet Energy Booster Pack

Shrouded Fable Booster Box (64 Packs)

Shrouded Fable Booster Pack

Stellar Crown Booster Box (64 Packs)

Stellar Crown Booster Pack

Surging Sparks Booster Box (64 Packs)

Surging Sparks Booster Pack

SVP Black Star Promos Booster Box (64 Packs)

SVP Black Star Promos Booster Pack

Temporal Forces Booster Box (64 Packs)

Temporal Forces Booster Pack

Twilight Masquerade Booster Box (64 Packs)

Twilight Masquerade Booster Pack

White Flare Booster Box (64 Packs)

White Flare Booster Pack