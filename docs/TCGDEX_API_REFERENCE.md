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



{
    "version": "v3",
    "sets": [
        {
            "id": "base1",
            "name": "Base Set",
            "serie": {
                "id": "base",
                "name": "BASE"
            },
            "cardCount": {
                "official": 102,
                "total": 102
            },
            "boosters": []
        },
        {
            "id": "base2",
            "name": "Jungle",
            "serie": {
                "id": "base",
                "name": "BASE"
            },
            "cardCount": {
                "official": 64,
                "total": 64
            },
            "boosters": []
        },
        {
            "id": "basep",
            "name": "Wizards Black Star Promos",
            "serie": {
                "id": "base",
                "name": "BASE"
            },
            "cardCount": {
                "official": 53,
                "total": 53
            },
            "boosters": []
        },
        {
            "id": "wp",
            "name": "W Promotional",
            "serie": {
                "id": "base",
                "name": "BASE"
            },
            "cardCount": {
                "official": 7,
                "total": 7
            },
            "boosters": []
        },
        {
            "id": "base3",
            "name": "Fossil",
            "serie": {
                "id": "base",
                "name": "BASE"
            },
            "cardCount": {
                "official": 62,
                "total": 62
            },
            "boosters": []
        },
        {
            "id": "base4",
            "name": "Base Set 2",
            "serie": {
                "id": "base",
                "name": "BASE"
            },
            "cardCount": {
                "official": 130,
                "total": 130
            },
            "boosters": []
        },
        {
            "id": "base5",
            "name": "Team Rocket",
            "serie": {
                "id": "base",
                "name": "BASE"
            },
            "cardCount": {
                "official": 82,
                "total": 83
            },
            "boosters": []
        },
        {
            "id": "ex1",
            "name": "Ruby & Sapphire",
            "serie": {
                "id": "ex",
                "name": "EX"
            },
            "cardCount": {
                "official": 109,
                "total": 109
            },
            "boosters": []
        },
        {
            "id": "ex2",
            "name": "Sandstorm",
            "serie": {
                "id": "ex",
                "name": "EX"
            },
            "cardCount": {
                "official": 100,
                "total": 100
            },
            "boosters": []
        },
        {
            "id": "ex3",
            "name": "Dragon",
            "serie": {
                "id": "ex",
                "name": "EX"
            },
            "cardCount": {
                "official": 97,
                "total": 100
            },
            "boosters": []
        },
        {
            "id": "ex4",
            "name": "Team Magma vs Team Aqua",
            "serie": {
                "id": "ex",
                "name": "EX"
            },
            "cardCount": {
                "official": 95,
                "total": 97
            },
            "boosters": []
        },
        {
            "id": "ex5",
            "name": "Hidden Legends",
            "serie": {
                "id": "ex",
                "name": "EX"
            },
            "cardCount": {
                "official": 101,
                "total": 102
            },
            "boosters": []
        },
        {
            "id": "ex5.5",
            "name": "Poké Card Creator Pack",
            "serie": {
                "id": "ex",
                "name": "EX"
            },
            "cardCount": {
                "official": 5,
                "total": 5
            },
            "boosters": []
        },
        {
            "id": "ex6",
            "name": "FireRed & LeafGreen",
            "serie": {
                "id": "ex",
                "name": "EX"
            },
            "cardCount": {
                "official": 112,
                "total": 116
            },
            "boosters": []
        },
        {
            "id": "ex7",
            "name": "Team Rocket Returns",
            "serie": {
                "id": "ex",
                "name": "EX"
            },
            "cardCount": {
                "official": 109,
                "total": 111
            },
            "boosters": []
        },
        {
            "id": "ex8",
            "name": "Deoxys",
            "serie": {
                "id": "ex",
                "name": "EX"
            },
            "cardCount": {
                "official": 107,
                "total": 108
            },
            "boosters": []
        },
        {
            "id": "ex9",
            "name": "Emerald",
            "serie": {
                "id": "ex",
                "name": "EX"
            },
            "cardCount": {
                "official": 106,
                "total": 107
            },
            "boosters": []
        },
        {
            "id": "ex10",
            "name": "Unseen Forces",
            "serie": {
                "id": "ex",
                "name": "EX"
            },
            "cardCount": {
                "official": 115,
                "total": 117
            },
            "boosters": []
        },
        {
            "id": "exu",
            "name": "Unseen Forces Unown Collection",
            "serie": {
                "id": "ex",
                "name": "EX"
            },
            "cardCount": {
                "official": 28,
                "total": 28
            },
            "boosters": []
        },
        {
            "id": "ex11",
            "name": "Delta Species",
            "serie": {
                "id": "ex",
                "name": "EX"
            },
            "cardCount": {
                "official": 113,
                "total": 114
            },
            "boosters": []
        },
        {
            "id": "ex12",
            "name": "Legend Maker",
            "serie": {
                "id": "ex",
                "name": "EX"
            },
            "cardCount": {
                "official": 92,
                "total": 93
            },
            "boosters": []
        },
        {
            "id": "ex13",
            "name": "Holon Phantoms",
            "serie": {
                "id": "ex",
                "name": "EX"
            },
            "cardCount": {
                "official": 110,
                "total": 111
            },
            "boosters": []
        },
        {
            "id": "ex14",
            "name": "Crystal Guardians",
            "serie": {
                "id": "ex",
                "name": "EX"
            },
            "cardCount": {
                "official": 100,
                "total": 100
            },
            "boosters": []
        },
        {
            "id": "ex15",
            "name": "Dragon Frontiers",
            "serie": {
                "id": "ex",
                "name": "EX"
            },
            "cardCount": {
                "official": 101,
                "total": 101
            },
            "boosters": []
        },
        {
            "id": "ex16",
            "name": "Power Keepers",
            "serie": {
                "id": "ex",
                "name": "EX"
            },
            "cardCount": {
                "official": 108,
                "total": 108
            },
            "boosters": []
        },
        {
            "id": "dpp",
            "name": "DP Black Star Promos",
            "serie": {
                "id": "dp",
                "name": "DP"
            },
            "cardCount": {
                "official": 56,
                "total": 56
            },
            "boosters": []
        },
        {
            "id": "dp1",
            "name": "Diamond & Pearl",
            "serie": {
                "id": "dp",
                "name": "DP"
            },
            "cardCount": {
                "official": 130,
                "total": 130
            },
            "boosters": []
        },
        {
            "id": "dp2",
            "name": "Mysterious Treasures",
            "serie": {
                "id": "dp",
                "name": "DP"
            },
            "cardCount": {
                "official": 122,
                "total": 124
            },
            "boosters": []
        },
        {
            "id": "dp3",
            "name": "Secret Wonders",
            "serie": {
                "id": "dp",
                "name": "DP"
            },
            "cardCount": {
                "official": 132,
                "total": 132
            },
            "boosters": []
        },
        {
            "id": "dp4",
            "name": "Great Encounters",
            "serie": {
                "id": "dp",
                "name": "DP"
            },
            "cardCount": {
                "official": 106,
                "total": 106
            },
            "boosters": []
        },
        {
            "id": "dp5",
            "name": "Majestic Dawn",
            "serie": {
                "id": "dp",
                "name": "DP"
            },
            "cardCount": {
                "official": 100,
                "total": 100
            },
            "boosters": []
        },
        {
            "id": "dp6",
            "name": "Legends Awakened",
            "serie": {
                "id": "dp",
                "name": "DP"
            },
            "cardCount": {
                "official": 146,
                "total": 146
            },
            "boosters": []
        },
        {
            "id": "dp7",
            "name": "Stormfront",
            "serie": {
                "id": "dp",
                "name": "DP"
            },
            "cardCount": {
                "official": 100,
                "total": 106
            },
            "boosters": []
        },
        {
            "id": "bw1",
            "name": "Black & White",
            "serie": {
                "id": "bw",
                "name": "BW"
            },
            "cardCount": {
                "official": 114,
                "total": 115
            },
            "boosters": []
        },
        {
            "id": "bwp",
            "name": "BW Black Star Promos",
            "serie": {
                "id": "bw",
                "name": "BW"
            },
            "cardCount": {
                "official": 101,
                "total": 101
            },
            "boosters": []
        },
        {
            "id": "bw2",
            "name": "Emerging Powers",
            "serie": {
                "id": "bw",
                "name": "BW"
            },
            "cardCount": {
                "official": 98,
                "total": 98
            },
            "boosters": []
        },
        {
            "id": "bw3",
            "name": "Noble Victories",
            "serie": {
                "id": "bw",
                "name": "BW"
            },
            "cardCount": {
                "official": 101,
                "total": 102
            },
            "boosters": []
        },
        {
            "id": "bw4",
            "name": "Next Destinies",
            "serie": {
                "id": "bw",
                "name": "BW"
            },
            "cardCount": {
                "official": 99,
                "total": 103
            },
            "boosters": []
        },
        {
            "id": "bw5",
            "name": "Dark Explorers",
            "serie": {
                "id": "bw",
                "name": "BW"
            },
            "cardCount": {
                "official": 108,
                "total": 111
            },
            "boosters": []
        },
        {
            "id": "bw6",
            "name": "Dragons Exalted",
            "serie": {
                "id": "bw",
                "name": "BW"
            },
            "cardCount": {
                "official": 124,
                "total": 128
            },
            "boosters": []
        },
        {
            "id": "dv1",
            "name": "Dragon Vault",
            "serie": {
                "id": "bw",
                "name": "BW"
            },
            "cardCount": {
                "official": 20,
                "total": 21
            },
            "boosters": []
        },
        {
            "id": "bw7",
            "name": "Boundaries Crossed",
            "serie": {
                "id": "bw",
                "name": "BW"
            },
            "cardCount": {
                "official": 149,
                "total": 153
            },
            "boosters": []
        },
        {
            "id": "bw8",
            "name": "Plasma Storm",
            "serie": {
                "id": "bw",
                "name": "BW"
            },
            "cardCount": {
                "official": 135,
                "total": 138
            },
            "boosters": []
        },
        {
            "id": "bw9",
            "name": "Plasma Freeze",
            "serie": {
                "id": "bw",
                "name": "BW"
            },
            "cardCount": {
                "official": 116,
                "total": 122
            },
            "boosters": []
        },
        {
            "id": "bw10",
            "name": "Plasma Blast",
            "serie": {
                "id": "bw",
                "name": "BW"
            },
            "cardCount": {
                "official": 101,
                "total": 105
            },
            "boosters": []
        },
        {
            "id": "rc",
            "name": "Radiant Collection",
            "serie": {
                "id": "bw",
                "name": "BW"
            },
            "cardCount": {
                "official": 25,
                "total": 25
            },
            "boosters": []
        },
        {
            "id": "bw11",
            "name": "Legendary Treasures",
            "serie": {
                "id": "bw",
                "name": "BW"
            },
            "cardCount": {
                "official": 113,
                "total": 140
            },
            "boosters": []
        },
        {
            "id": "xyp",
            "name": "XY Black Star Promos",
            "serie": {
                "id": "xy",
                "name": "XY"
            },
            "cardCount": {
                "official": 211,
                "total": 216
            },
            "boosters": []
        },
        {
            "id": "xy0",
            "name": "Kalos Starter Set",
            "serie": {
                "id": "xy",
                "name": "XY"
            },
            "cardCount": {
                "official": 39,
                "total": 39
            },
            "boosters": []
        },
        {
            "id": "xya",
            "name": "Yellow A Alternate",
            "serie": {
                "id": "xy",
                "name": "XY"
            },
            "cardCount": {
                "official": 6,
                "total": 6
            },
            "boosters": []
        },
        {
            "id": "xy1",
            "name": "XY",
            "serie": {
                "id": "xy",
                "name": "XY"
            },
            "cardCount": {
                "official": 146,
                "total": 146
            },
            "boosters": []
        },
        {
            "id": "xy2",
            "name": "Flashfire",
            "serie": {
                "id": "xy",
                "name": "XY"
            },
            "cardCount": {
                "official": 106,
                "total": 110
            },
            "boosters": []
        },
        {
            "id": "xy3",
            "name": "Furious Fists",
            "serie": {
                "id": "xy",
                "name": "XY"
            },
            "cardCount": {
                "official": 111,
                "total": 114
            },
            "boosters": []
        },
        {
            "id": "xy4",
            "name": "Phantom Forces",
            "serie": {
                "id": "xy",
                "name": "XY"
            },
            "cardCount": {
                "official": 119,
                "total": 124
            },
            "boosters": []
        },
        {
            "id": "xy5",
            "name": "Primal Clash",
            "serie": {
                "id": "xy",
                "name": "XY"
            },
            "cardCount": {
                "official": 160,
                "total": 164
            },
            "boosters": []
        },
        {
            "id": "dc1",
            "name": "Double Crisis",
            "serie": {
                "id": "xy",
                "name": "XY"
            },
            "cardCount": {
                "official": 34,
                "total": 34
            },
            "boosters": []
        },
        {
            "id": "xy6",
            "name": "Roaring Skies",
            "serie": {
                "id": "xy",
                "name": "XY"
            },
            "cardCount": {
                "official": 108,
                "total": 112
            },
            "boosters": []
        },
        {
            "id": "xy7",
            "name": "Ancient Origins",
            "serie": {
                "id": "xy",
                "name": "XY"
            },
            "cardCount": {
                "official": 98,
                "total": 101
            },
            "boosters": []
        },
        {
            "id": "xy8",
            "name": "BREAKthrough",
            "serie": {
                "id": "xy",
                "name": "XY"
            },
            "cardCount": {
                "official": 162,
                "total": 165
            },
            "boosters": []
        },
        {
            "id": "xy9",
            "name": "BREAKpoint",
            "serie": {
                "id": "xy",
                "name": "XY"
            },
            "cardCount": {
                "official": 122,
                "total": 126
            },
            "boosters": []
        },
        {
            "id": "g1",
            "name": "Generations",
            "serie": {
                "id": "xy",
                "name": "XY"
            },
            "cardCount": {
                "official": 83,
                "total": 117
            },
            "boosters": []
        },
        {
            "id": "xy10",
            "name": "Fates Collide",
            "serie": {
                "id": "xy",
                "name": "XY"
            },
            "cardCount": {
                "official": 124,
                "total": 129
            },
            "boosters": []
        },
        {
            "id": "xy11",
            "name": "Steam Siege",
            "serie": {
                "id": "xy",
                "name": "XY"
            },
            "cardCount": {
                "official": 114,
                "total": 116
            },
            "boosters": []
        },
        {
            "id": "xy12",
            "name": "Evolutions",
            "serie": {
                "id": "xy",
                "name": "XY"
            },
            "cardCount": {
                "official": 108,
                "total": 113
            },
            "boosters": []
        },
        {
            "id": "smp",
            "name": "SM Black Star Promos",
            "serie": {
                "id": "sm",
                "name": "SM"
            },
            "cardCount": {
                "official": 236,
                "total": 244
            },
            "boosters": []
        },
        {
            "id": "sm1",
            "name": "Sun & Moon",
            "serie": {
                "id": "sm",
                "name": "SM"
            },
            "cardCount": {
                "official": 149,
                "total": 172
            },
            "boosters": []
        },
        {
            "id": "sm2",
            "name": "Guardians Rising",
            "serie": {
                "id": "sm",
                "name": "SM"
            },
            "cardCount": {
                "official": 145,
                "total": 169
            },
            "boosters": []
        },
        {
            "id": "sm3",
            "name": "Burning Shadows",
            "serie": {
                "id": "sm",
                "name": "SM"
            },
            "cardCount": {
                "official": 147,
                "total": 169
            },
            "boosters": []
        },
        {
            "id": "sm3.5",
            "name": "Shining Legends",
            "serie": {
                "id": "sm",
                "name": "SM"
            },
            "cardCount": {
                "official": 73,
                "total": 78
            },
            "boosters": []
        },
        {
            "id": "sm4",
            "name": "Crimson Invasion",
            "serie": {
                "id": "sm",
                "name": "SM"
            },
            "cardCount": {
                "official": 111,
                "total": 125
            },
            "boosters": []
        },
        {
            "id": "sm5",
            "name": "Ultra Prism",
            "serie": {
                "id": "sm",
                "name": "SM"
            },
            "cardCount": {
                "official": 156,
                "total": 173
            },
            "boosters": []
        },
        {
            "id": "sm6",
            "name": "Forbidden Light",
            "serie": {
                "id": "sm",
                "name": "SM"
            },
            "cardCount": {
                "official": 131,
                "total": 146
            },
            "boosters": []
        },
        {
            "id": "sm7",
            "name": "Celestial Storm",
            "serie": {
                "id": "sm",
                "name": "SM"
            },
            "cardCount": {
                "official": 168,
                "total": 183
            },
            "boosters": []
        },
        {
            "id": "sm7.5",
            "name": "Dragon Majesty",
            "serie": {
                "id": "sm",
                "name": "SM"
            },
            "cardCount": {
                "official": 70,
                "total": 78
            },
            "boosters": []
        },
        {
            "id": "sm8",
            "name": "Lost Thunder",
            "serie": {
                "id": "sm",
                "name": "SM"
            },
            "cardCount": {
                "official": 214,
                "total": 236
            },
            "boosters": []
        },
        {
            "id": "sm9",
            "name": "Team Up",
            "serie": {
                "id": "sm",
                "name": "SM"
            },
            "cardCount": {
                "official": 181,
                "total": 196
            },
            "boosters": []
        },
        {
            "id": "det1",
            "name": "Detective Pikachu",
            "serie": {
                "id": "sm",
                "name": "SM"
            },
            "cardCount": {
                "official": 18,
                "total": 18
            },
            "boosters": []
        },
        {
            "id": "sm10",
            "name": "Unbroken Bonds",
            "serie": {
                "id": "sm",
                "name": "SM"
            },
            "cardCount": {
                "official": 214,
                "total": 234
            },
            "boosters": []
        },
        {
            "id": "sm11",
            "name": "Unified Minds",
            "serie": {
                "id": "sm",
                "name": "SM"
            },
            "cardCount": {
                "official": 236,
                "total": 258
            },
            "boosters": []
        },
        {
            "id": "sm115",
            "name": "Hidden Fates",
            "serie": {
                "id": "sm",
                "name": "SM"
            },
            "cardCount": {
                "official": 68,
                "total": 69
            },
            "boosters": []
        },
        {
            "id": "sma",
            "name": "Hidden Fates Shiny Vault",
            "serie": {
                "id": "sm",
                "name": "SM"
            },
            "cardCount": {
                "official": 94,
                "total": 94
            },
            "boosters": []
        },
        {
            "id": "sm12",
            "name": "Cosmic Eclipse",
            "serie": {
                "id": "sm",
                "name": "SM"
            },
            "cardCount": {
                "official": 236,
                "total": 271
            },
            "boosters": []
        },
        {
            "id": "swshp",
            "name": "SWSH Black Star Promos",
            "serie": {
                "id": "swsh",
                "name": "SWSH"
            },
            "cardCount": {
                "official": 107,
                "total": 288
            },
            "boosters": []
        },
        {
            "id": "swsh1",
            "name": "Sword & Shield",
            "serie": {
                "id": "swsh",
                "name": "SWSH"
            },
            "cardCount": {
                "official": 202,
                "total": 216
            },
            "boosters": []
        },
        {
            "id": "swsh2",
            "name": "Rebel Clash",
            "serie": {
                "id": "swsh",
                "name": "SWSH"
            },
            "cardCount": {
                "official": 192,
                "total": 209
            },
            "boosters": []
        },
        {
            "id": "swsh3",
            "name": "Darkness Ablaze",
            "serie": {
                "id": "swsh",
                "name": "SWSH"
            },
            "cardCount": {
                "official": 189,
                "total": 201
            },
            "boosters": []
        },
        {
            "id": "fut2020",
            "name": "Pokémon Futsal 2020",
            "serie": {
                "id": "swsh",
                "name": "SWSH"
            },
            "cardCount": {
                "official": 5,
                "total": 5
            },
            "boosters": []
        },
        {
            "id": "swsh3.5",
            "name": "Champion's Path",
            "serie": {
                "id": "swsh",
                "name": "SWSH"
            },
            "cardCount": {
                "official": 73,
                "total": 80
            },
            "boosters": []
        },
        {
            "id": "swsh4",
            "name": "Vivid Voltage",
            "serie": {
                "id": "swsh",
                "name": "SWSH"
            },
            "cardCount": {
                "official": 185,
                "total": 203
            },
            "boosters": []
        },
        {
            "id": "swsh4.5",
            "name": "Shining Fates",
            "serie": {
                "id": "swsh",
                "name": "SWSH"
            },
            "cardCount": {
                "official": 72,
                "total": 195
            },
            "boosters": []
        },
        {
            "id": "swsh5",
            "name": "Battle Styles",
            "serie": {
                "id": "swsh",
                "name": "SWSH"
            },
            "cardCount": {
                "official": 163,
                "total": 183
            },
            "boosters": []
        },
        {
            "id": "swsh6",
            "name": "Chilling Reign",
            "serie": {
                "id": "swsh",
                "name": "SWSH"
            },
            "cardCount": {
                "official": 198,
                "total": 233
            },
            "boosters": []
        },
        {
            "id": "swsh7",
            "name": "Evolving Skies",
            "serie": {
                "id": "swsh",
                "name": "SWSH"
            },
            "cardCount": {
                "official": 203,
                "total": 237
            },
            "boosters": []
        },
        {
            "id": "cel25",
            "name": "Celebrations",
            "serie": {
                "id": "swsh",
                "name": "SWSH"
            },
            "cardCount": {
                "official": 25,
                "total": 50
            },
            "boosters": []
        },
        {
            "id": "swsh8",
            "name": "Fusion Strike",
            "serie": {
                "id": "swsh",
                "name": "SWSH"
            },
            "cardCount": {
                "official": 264,
                "total": 284
            },
            "boosters": []
        },
        {
            "id": "swsh9",
            "name": "Brilliant Stars",
            "serie": {
                "id": "swsh",
                "name": "SWSH"
            },
            "cardCount": {
                "official": 172,
                "total": 216
            },
            "boosters": []
        },
        {
            "id": "swsh10",
            "name": "Astral Radiance",
            "serie": {
                "id": "swsh",
                "name": "SWSH"
            },
            "cardCount": {
                "official": 189,
                "total": 246
            },
            "boosters": []
        },
        {
            "id": "swsh10.5",
            "name": "Pokémon GO",
            "serie": {
                "id": "swsh",
                "name": "SWSH"
            },
            "cardCount": {
                "official": 78,
                "total": 88
            },
            "boosters": []
        },
        {
            "id": "swsh11",
            "name": "Lost Origin",
            "serie": {
                "id": "swsh",
                "name": "SWSH"
            },
            "cardCount": {
                "official": 196,
                "total": 247
            },
            "boosters": []
        },
        {
            "id": "swsh12",
            "name": "Silver Tempest",
            "serie": {
                "id": "swsh",
                "name": "SWSH"
            },
            "cardCount": {
                "official": 195,
                "total": 245
            },
            "boosters": []
        },
        {
            "id": "swsh12.5",
            "name": "Crown Zenith",
            "serie": {
                "id": "swsh",
                "name": "SWSH"
            },
            "cardCount": {
                "official": 159,
                "total": 230
            },
            "boosters": []
        },
        {
            "id": "sve",
            "name": "Scarlet & Violet Energy",
            "serie": {
                "id": "sv",
                "name": "SV"
            },
            "cardCount": {
                "official": 24,
                "total": 24
            },
            "boosters": []
        },
        {
            "id": "svp",
            "name": "SVP Black Star Promos",
            "serie": {
                "id": "sv",
                "name": "SV"
            },
            "cardCount": {
                "official": 225,
                "total": 226
            },
            "boosters": []
        },
        {
            "id": "sv01",
            "name": "Scarlet & Violet",
            "serie": {
                "id": "sv",
                "name": "SV"
            },
            "cardCount": {
                "official": 198,
                "total": 258
            },
            "boosters": []
        },
        {
            "id": "sv02",
            "name": "Paldea Evolved",
            "serie": {
                "id": "sv",
                "name": "SV"
            },
            "cardCount": {
                "official": 193,
                "total": 279
            },
            "boosters": []
        },
        {
            "id": "sv03",
            "name": "Obsidian Flames",
            "serie": {
                "id": "sv",
                "name": "SV"
            },
            "cardCount": {
                "official": 197,
                "total": 230
            },
            "boosters": []
        },
        {
            "id": "sv03.5",
            "name": "151",
            "serie": {
                "id": "sv",
                "name": "SV"
            },
            "cardCount": {
                "official": 165,
                "total": 207
            },
            "boosters": []
        },
        {
            "id": "sv04",
            "name": "Paradox Rift",
            "serie": {
                "id": "sv",
                "name": "SV"
            },
            "cardCount": {
                "official": 182,
                "total": 266
            },
            "boosters": []
        },
        {
            "id": "sv04.5",
            "name": "Paldean Fates",
            "serie": {
                "id": "sv",
                "name": "SV"
            },
            "cardCount": {
                "official": 91,
                "total": 245
            },
            "boosters": []
        },
        {
            "id": "sv05",
            "name": "Temporal Forces",
            "serie": {
                "id": "sv",
                "name": "SV"
            },
            "cardCount": {
                "official": 162,
                "total": 218
            },
            "boosters": []
        },
        {
            "id": "sv06",
            "name": "Twilight Masquerade",
            "serie": {
                "id": "sv",
                "name": "SV"
            },
            "cardCount": {
                "official": 167,
                "total": 226
            },
            "boosters": []
        },
        {
            "id": "sv06.5",
            "name": "Shrouded Fable",
            "serie": {
                "id": "sv",
                "name": "SV"
            },
            "cardCount": {
                "official": 64,
                "total": 99
            },
            "boosters": []
        },
        {
            "id": "sv07",
            "name": "Stellar Crown",
            "serie": {
                "id": "sv",
                "name": "SV"
            },
            "cardCount": {
                "official": 142,
                "total": 175
            },
            "boosters": []
        },
        {
            "id": "sv08",
            "name": "Surging Sparks",
            "serie": {
                "id": "sv",
                "name": "SV"
            },
            "cardCount": {
                "official": 191,
                "total": 252
            },
            "boosters": []
        },
        {
            "id": "sv08.5",
            "name": "Prismatic Evolutions",
            "serie": {
                "id": "sv",
                "name": "SV"
            },
            "cardCount": {
                "official": 131,
                "total": 180
            },
            "boosters": []
        },
        {
            "id": "sv09",
            "name": "Journey Together",
            "serie": {
                "id": "sv",
                "name": "SV"
            },
            "cardCount": {
                "official": 159,
                "total": 190
            },
            "boosters": []
        },
        {
            "id": "sv10",
            "name": "Destined Rivals",
            "serie": {
                "id": "sv",
                "name": "SV"
            },
            "cardCount": {
                "official": 182,
                "total": 244
            },
            "boosters": []
        },
        {
            "id": "sv10.5w",
            "name": "White Flare",
            "serie": {
                "id": "sv",
                "name": "SV"
            },
            "cardCount": {
                "official": 86,
                "total": 173
            },
            "boosters": []
        },
        {
            "id": "sv10.5b",
            "name": "Black Bolt",
            "serie": {
                "id": "sv",
                "name": "SV"
            },
            "cardCount": {
                "official": 86,
                "total": 172
            },
            "boosters": []
        }
    ],
    "shopItems": {
        "pack_base1": {
            "id": "pack_base1",
            "name": "Base Set Booster Pack",
            "buyPrice": 1.41,
            "sellPrice": 2.26,
            "requiredLevel": 1,
            "type": "pack",
            "volume": 1,
            "description": "Pack của bộ Base Set. Thế hệ: GENERATION I.",
            "sourceSetId": "base1",
            "generation": "GENERATION I"
        },
        "box_base1": {
            "id": "box_base1",
            "name": "Base Set Booster Box (64 Packs)",
            "buyPrice": 76.7,
            "sellPrice": 126.34,
            "requiredLevel": 5,
            "type": "box",
            "volume": 16,
            "contains": {
                "itemId": "pack_base1",
                "amount": 64
            },
            "description": "Hộp Base Set gồm 64 Booster Pack. Giá sỉ cực tốt.",
            "sourceSetId": "base1",
            "generation": "GENERATION I"
        },
        "pack_base2": {
            "id": "pack_base2",
            "name": "Jungle Booster Pack",
            "buyPrice": 1.32,
            "sellPrice": 2.11,
            "requiredLevel": 1,
            "type": "pack",
            "volume": 1,
            "description": "Pack của bộ Jungle. Thế hệ: GENERATION I.",
            "sourceSetId": "base2",
            "generation": "GENERATION I"
        },
        "box_base2": {
            "id": "box_base2",
            "name": "Jungle Booster Box (64 Packs)",
            "buyPrice": 71.81,
            "sellPrice": 118.27,
            "requiredLevel": 5,
            "type": "box",
            "volume": 16,
            "contains": {
                "itemId": "pack_base2",
                "amount": 64
            },
            "description": "Hộp Jungle gồm 64 Booster Pack. Giá sỉ cực tốt.",
            "sourceSetId": "base2",
            "generation": "GENERATION I"
        },
        "pack_base3": {
            "id": "pack_base3",
            "name": "Fossil Booster Pack",
            "buyPrice": 1.7,
            "sellPrice": 2.72,
            "requiredLevel": 1,
            "type": "pack",
            "volume": 1,
            "description": "Pack của bộ Fossil. Thế hệ: GENERATION I.",
            "sourceSetId": "base3",
            "generation": "GENERATION I"
        },
        "box_base3": {
            "id": "box_base3",
            "name": "Fossil Booster Box (64 Packs)",
            "buyPrice": 92.48,
            "sellPrice": 152.32,
            "requiredLevel": 5,
            "type": "box",
            "volume": 16,
            "contains": {
                "itemId": "pack_base3",
                "amount": 64
            },
            "description": "Hộp Fossil gồm 64 Booster Pack. Giá sỉ cực tốt.",
            "sourceSetId": "base3",
            "generation": "GENERATION I"
        },
        "pack_base4": {
            "id": "pack_base4",
            "name": "Base Set 2 Booster Pack",
            "buyPrice": 1.36,
            "sellPrice": 2.18,
            "requiredLevel": 1,
            "type": "pack",
            "volume": 1,
            "description": "Pack của bộ Base Set 2. Thế hệ: GENERATION I.",
            "sourceSetId": "base4",
            "generation": "GENERATION I"
        },
        "box_base4": {
            "id": "box_base4",
            "name": "Base Set 2 Booster Box (64 Packs)",
            "buyPrice": 73.98,
            "sellPrice": 121.86,
            "requiredLevel": 5,
            "type": "box",
            "volume": 16,
            "contains": {
                "itemId": "pack_base4",
                "amount": 64
            },
            "description": "Hộp Base Set 2 gồm 64 Booster Pack. Giá sỉ cực tốt.",
            "sourceSetId": "base4",
            "generation": "GENERATION I"
        },
        "pack_base5": {
            "id": "pack_base5",
            "name": "Team Rocket Booster Pack",
            "buyPrice": 1.59,
            "sellPrice": 2.54,
            "requiredLevel": 1,
            "type": "pack",
            "volume": 1,
            "description": "Pack của bộ Team Rocket. Thế hệ: GENERATION I.",
            "sourceSetId": "base5",
            "generation": "GENERATION I"
        },
        "box_base5": {
            "id": "box_base5",
            "name": "Team Rocket Booster Box (64 Packs)",
            "buyPrice": 86.5,
            "sellPrice": 142.46,
            "requiredLevel": 5,
            "type": "box",
            "volume": 16,
            "contains": {
                "itemId": "pack_base5",
                "amount": 64
            },
            "description": "Hộp Team Rocket gồm 64 Booster Pack. Giá sỉ cực tốt.",
            "sourceSetId": "base5",
            "generation": "GENERATION I"
        },
        "pack_ex1": {
            "id": "pack_ex1",
            "name": "Ruby & Sapphire Booster Pack",
            "buyPrice": 1.75,
            "sellPrice": 2.8,
            "requiredLevel": 11,
            "type": "pack",
            "volume": 1,
            "description": "Pack của bộ Ruby & Sapphire. Thế hệ: GENERATION III.",
            "sourceSetId": "ex1",
            "generation": "GENERATION III"
        },
        "box_ex1": {
            "id": "box_ex1",
            "name": "Ruby & Sapphire Booster Box (64 Packs)",
            "buyPrice": 95.2,
            "sellPrice": 156.8,
            "requiredLevel": 11,
            "type": "box",
            "volume": 16,
            "contains": {
                "itemId": "pack_ex1",
                "amount": 64
            },
            "description": "Hộp Ruby & Sapphire gồm 64 Booster Pack. Giá sỉ cực tốt.",
            "sourceSetId": "ex1",
            "generation": "GENERATION III"
        },
        "pack_ex2": {
            "id": "pack_ex2",
            "name": "Sandstorm Booster Pack",
            "buyPrice": 1.87,
            "sellPrice": 2.99,
            "requiredLevel": 11,
            "type": "pack",
            "volume": 1,
            "description": "Pack của bộ Sandstorm. Thế hệ: GENERATION III.",
            "sourceSetId": "ex2",
            "generation": "GENERATION III"
        },
        "box_ex2": {
            "id": "box_ex2",
            "name": "Sandstorm Booster Box (64 Packs)",
            "buyPrice": 101.73,
            "sellPrice": 167.55,
            "requiredLevel": 11,
            "type": "box",
            "volume": 16,
            "contains": {
                "itemId": "pack_ex2",
                "amount": 64
            },
            "description": "Hộp Sandstorm gồm 64 Booster Pack. Giá sỉ cực tốt.",
            "sourceSetId": "ex2",
            "generation": "GENERATION III"
        },
        "pack_ex3": {
            "id": "pack_ex3",
            "name": "Dragon Booster Pack",
            "buyPrice": 1.64,
            "sellPrice": 2.62,
            "requiredLevel": 11,
            "type": "pack",
            "volume": 1,
            "description": "Pack của bộ Dragon. Thế hệ: GENERATION III.",
            "sourceSetId": "ex3",
            "generation": "GENERATION III"
        },
        "box_ex3": {
            "id": "box_ex3",
            "name": "Dragon Booster Box (64 Packs)",
            "buyPrice": 89.22,
            "sellPrice": 146.94,
            "requiredLevel": 11,
            "type": "box",
            "volume": 16,
            "contains": {
                "itemId": "pack_ex3",
                "amount": 64
            },
            "description": "Hộp Dragon gồm 64 Booster Pack. Giá sỉ cực tốt.",
            "sourceSetId": "ex3",
            "generation": "GENERATION III"
        },
        "pack_ex4": {
            "id": "pack_ex4",
            "name": "Team Magma vs Team Aqua Booster Pack",
            "buyPrice": 1.27,
            "sellPrice": 2.03,
            "requiredLevel": 11,
            "type": "pack",
            "volume": 1,
            "description": "Pack của bộ Team Magma vs Team Aqua. Thế hệ: GENERATION III.",
            "sourceSetId": "ex4",
            "generation": "GENERATION III"
        },
        "box_ex4": {
            "id": "box_ex4",
            "name": "Team Magma vs Team Aqua Booster Box (64 Packs)",
            "buyPrice": 69.09,
            "sellPrice": 113.79,
            "requiredLevel": 11,
            "type": "box",
            "volume": 16,
            "contains": {
                "itemId": "pack_ex4",
                "amount": 64
            },
            "description": "Hộp Team Magma vs Team Aqua gồm 64 Booster Pack. Giá sỉ cực tốt.",
            "sourceSetId": "ex4",
            "generation": "GENERATION III"
        },
        "pack_ex5": {
            "id": "pack_ex5",
            "name": "Hidden Legends Booster Pack",
            "buyPrice": 1.66,
            "sellPrice": 2.66,
            "requiredLevel": 11,
            "type": "pack",
            "volume": 1,
            "description": "Pack của bộ Hidden Legends. Thế hệ: GENERATION III.",
            "sourceSetId": "ex5",
            "generation": "GENERATION III"
        },
        "box_ex5": {
            "id": "box_ex5",
            "name": "Hidden Legends Booster Box (64 Packs)",
            "buyPrice": 90.3,
            "sellPrice": 148.74,
            "requiredLevel": 11,
            "type": "box",
            "volume": 16,
            "contains": {
                "itemId": "pack_ex5",
                "amount": 64
            },
            "description": "Hộp Hidden Legends gồm 64 Booster Pack. Giá sỉ cực tốt.",
            "sourceSetId": "ex5",
            "generation": "GENERATION III"
        },
        "pack_ex5_5": {
            "id": "pack_ex5_5",
            "name": "Poké Card Creator Pack Booster Pack",
            "buyPrice": 1.61,
            "sellPrice": 2.58,
            "requiredLevel": 11,
            "type": "pack",
            "volume": 1,
            "description": "Pack của bộ Poké Card Creator Pack. Thế hệ: GENERATION III.",
            "sourceSetId": "ex5.5",
            "generation": "GENERATION III"
        },
        "box_ex5_5": {
            "id": "box_ex5_5",
            "name": "Poké Card Creator Pack Booster Box (64 Packs)",
            "buyPrice": 87.58,
            "sellPrice": 144.26,
            "requiredLevel": 11,
            "type": "box",
            "volume": 16,
            "contains": {
                "itemId": "pack_ex5_5",
                "amount": 64
            },
            "description": "Hộp Poké Card Creator Pack gồm 64 Booster Pack. Giá sỉ cực tốt.",
            "sourceSetId": "ex5.5",
            "generation": "GENERATION III"
        },
        "pack_ex6": {
            "id": "pack_ex6",
            "name": "FireRed & LeafGreen Booster Pack",
            "buyPrice": 1.62,
            "sellPrice": 2.59,
            "requiredLevel": 11,
            "type": "pack",
            "volume": 1,
            "description": "Pack của bộ FireRed & LeafGreen. Thế hệ: GENERATION III.",
            "sourceSetId": "ex6",
            "generation": "GENERATION III"
        },
        "box_ex6": {
            "id": "box_ex6",
            "name": "FireRed & LeafGreen Booster Box (64 Packs)",
            "buyPrice": 88.13,
            "sellPrice": 145.15,
            "requiredLevel": 11,
            "type": "box",
            "volume": 16,
            "contains": {
                "itemId": "pack_ex6",
                "amount": 64
            },
            "description": "Hộp FireRed & LeafGreen gồm 64 Booster Pack. Giá sỉ cực tốt.",
            "sourceSetId": "ex6",
            "generation": "GENERATION III"
        },
        "pack_ex7": {
            "id": "pack_ex7",
            "name": "Team Rocket Returns Booster Pack",
            "buyPrice": 1.72,
            "sellPrice": 2.75,
            "requiredLevel": 11,
            "type": "pack",
            "volume": 1,
            "description": "Pack của bộ Team Rocket Returns. Thế hệ: GENERATION III.",
            "sourceSetId": "ex7",
            "generation": "GENERATION III"
        },
        "box_ex7": {
            "id": "box_ex7",
            "name": "Team Rocket Returns Booster Box (64 Packs)",
            "buyPrice": 93.57,
            "sellPrice": 154.11,
            "requiredLevel": 11,
            "type": "box",
            "volume": 16,
            "contains": {
                "itemId": "pack_ex7",
                "amount": 64
            },
            "description": "Hộp Team Rocket Returns gồm 64 Booster Pack. Giá sỉ cực tốt.",
            "sourceSetId": "ex7",
            "generation": "GENERATION III"
        },
        "pack_ex8": {
            "id": "pack_ex8",
            "name": "Deoxys Booster Pack",
            "buyPrice": 1.66,
            "sellPrice": 2.66,
            "requiredLevel": 11,
            "type": "pack",
            "volume": 1,
            "description": "Pack của bộ Deoxys. Thế hệ: GENERATION III.",
            "sourceSetId": "ex8",
            "generation": "GENERATION III"
        },
        "box_ex8": {
            "id": "box_ex8",
            "name": "Deoxys Booster Box (64 Packs)",
            "buyPrice": 90.3,
            "sellPrice": 148.74,
            "requiredLevel": 11,
            "type": "box",
            "volume": 16,
            "contains": {
                "itemId": "pack_ex8",
                "amount": 64
            },
            "description": "Hộp Deoxys gồm 64 Booster Pack. Giá sỉ cực tốt.",
            "sourceSetId": "ex8",
            "generation": "GENERATION III"
        },
        "pack_ex9": {
            "id": "pack_ex9",
            "name": "Emerald Booster Pack",
            "buyPrice": 1.55,
            "sellPrice": 2.48,
            "requiredLevel": 11,
            "type": "pack",
            "volume": 1,
            "description": "Pack của bộ Emerald. Thế hệ: GENERATION III.",
            "sourceSetId": "ex9",
            "generation": "GENERATION III"
        },
        "box_ex9": {
            "id": "box_ex9",
            "name": "Emerald Booster Box (64 Packs)",
            "buyPrice": 84.32,
            "sellPrice": 138.88,
            "requiredLevel": 11,
            "type": "box",
            "volume": 16,
            "contains": {
                "itemId": "pack_ex9",
                "amount": 64
            },
            "description": "Hộp Emerald gồm 64 Booster Pack. Giá sỉ cực tốt.",
            "sourceSetId": "ex9",
            "generation": "GENERATION III"
        },
        "pack_ex10": {
            "id": "pack_ex10",
            "name": "Unseen Forces Booster Pack",
            "buyPrice": 1.45,
            "sellPrice": 2.32,
            "requiredLevel": 11,
            "type": "pack",
            "volume": 1,
            "description": "Pack của bộ Unseen Forces. Thế hệ: GENERATION III.",
            "sourceSetId": "ex10",
            "generation": "GENERATION III"
        },
        "box_ex10": {
            "id": "box_ex10",
            "name": "Unseen Forces Booster Box (64 Packs)",
            "buyPrice": 78.88,
            "sellPrice": 129.92,
            "requiredLevel": 11,
            "type": "box",
            "volume": 16,
            "contains": {
                "itemId": "pack_ex10",
                "amount": 64
            },
            "description": "Hộp Unseen Forces gồm 64 Booster Pack. Giá sỉ cực tốt.",
            "sourceSetId": "ex10",
            "generation": "GENERATION III"
        },
        "pack_ex11": {
            "id": "pack_ex11",
            "name": "Delta Species Booster Pack",
            "buyPrice": 1.55,
            "sellPrice": 2.48,
            "requiredLevel": 11,
            "type": "pack",
            "volume": 1,
            "description": "Pack của bộ Delta Species. Thế hệ: GENERATION III.",
            "sourceSetId": "ex11",
            "generation": "GENERATION III"
        },
        "box_ex11": {
            "id": "box_ex11",
            "name": "Delta Species Booster Box (64 Packs)",
            "buyPrice": 84.32,
            "sellPrice": 138.88,
            "requiredLevel": 11,
            "type": "box",
            "volume": 16,
            "contains": {
                "itemId": "pack_ex11",
                "amount": 64
            },
            "description": "Hộp Delta Species gồm 64 Booster Pack. Giá sỉ cực tốt.",
            "sourceSetId": "ex11",
            "generation": "GENERATION III"
        },
        "pack_ex12": {
            "id": "pack_ex12",
            "name": "Legend Maker Booster Pack",
            "buyPrice": 1.36,
            "sellPrice": 2.18,
            "requiredLevel": 11,
            "type": "pack",
            "volume": 1,
            "description": "Pack của bộ Legend Maker. Thế hệ: GENERATION III.",
            "sourceSetId": "ex12",
            "generation": "GENERATION III"
        },
        "box_ex12": {
            "id": "box_ex12",
            "name": "Legend Maker Booster Box (64 Packs)",
            "buyPrice": 73.98,
            "sellPrice": 121.86,
            "requiredLevel": 11,
            "type": "box",
            "volume": 16,
            "contains": {
                "itemId": "pack_ex12",
                "amount": 64
            },
            "description": "Hộp Legend Maker gồm 64 Booster Pack. Giá sỉ cực tốt.",
            "sourceSetId": "ex12",
            "generation": "GENERATION III"
        },
        "pack_ex13": {
            "id": "pack_ex13",
            "name": "Holon Phantoms Booster Pack",
            "buyPrice": 1.27,
            "sellPrice": 2.03,
            "requiredLevel": 11,
            "type": "pack",
            "volume": 1,
            "description": "Pack của bộ Holon Phantoms. Thế hệ: GENERATION III.",
            "sourceSetId": "ex13",
            "generation": "GENERATION III"
        },
        "box_ex13": {
            "id": "box_ex13",
            "name": "Holon Phantoms Booster Box (64 Packs)",
            "buyPrice": 69.09,
            "sellPrice": 113.79,
            "requiredLevel": 11,
            "type": "box",
            "volume": 16,
            "contains": {
                "itemId": "pack_ex13",
                "amount": 64
            },
            "description": "Hộp Holon Phantoms gồm 64 Booster Pack. Giá sỉ cực tốt.",
            "sourceSetId": "ex13",
            "generation": "GENERATION III"
        },
        "pack_ex14": {
            "id": "pack_ex14",
            "name": "Crystal Guardians Booster Pack",
            "buyPrice": 1.86,
            "sellPrice": 2.98,
            "requiredLevel": 11,
            "type": "pack",
            "volume": 1,
            "description": "Pack của bộ Crystal Guardians. Thế hệ: GENERATION III.",
            "sourceSetId": "ex14",
            "generation": "GENERATION III"
        },
        "box_ex14": {
            "id": "box_ex14",
            "name": "Crystal Guardians Booster Box (64 Packs)",
            "buyPrice": 101.18,
            "sellPrice": 166.66,
            "requiredLevel": 11,
            "type": "box",
            "volume": 16,
            "contains": {
                "itemId": "pack_ex14",
                "amount": 64
            },
            "description": "Hộp Crystal Guardians gồm 64 Booster Pack. Giá sỉ cực tốt.",
            "sourceSetId": "ex14",
            "generation": "GENERATION III"
        },
        "pack_ex15": {
            "id": "pack_ex15",
            "name": "Dragon Frontiers Booster Pack",
            "buyPrice": 1.7,
            "sellPrice": 2.72,
            "requiredLevel": 11,
            "type": "pack",
            "volume": 1,
            "description": "Pack của bộ Dragon Frontiers. Thế hệ: GENERATION III.",
            "sourceSetId": "ex15",
            "generation": "GENERATION III"
        },
        "box_ex15": {
            "id": "box_ex15",
            "name": "Dragon Frontiers Booster Box (64 Packs)",
            "buyPrice": 92.48,
            "sellPrice": 152.32,
            "requiredLevel": 11,
            "type": "box",
            "volume": 16,
            "contains": {
                "itemId": "pack_ex15",
                "amount": 64
            },
            "description": "Hộp Dragon Frontiers gồm 64 Booster Pack. Giá sỉ cực tốt.",
            "sourceSetId": "ex15",
            "generation": "GENERATION III"
        },
        "pack_ex16": {
            "id": "pack_ex16",
            "name": "Power Keepers Booster Pack",
            "buyPrice": 1.31,
            "sellPrice": 2.1,
            "requiredLevel": 11,
            "type": "pack",
            "volume": 1,
            "description": "Pack của bộ Power Keepers. Thế hệ: GENERATION III.",
            "sourceSetId": "ex16",
            "generation": "GENERATION III"
        },
        "box_ex16": {
            "id": "box_ex16",
            "name": "Power Keepers Booster Box (64 Packs)",
            "buyPrice": 71.26,
            "sellPrice": 117.38,
            "requiredLevel": 11,
            "type": "box",
            "volume": 16,
            "contains": {
                "itemId": "pack_ex16",
                "amount": 64
            },
            "description": "Hộp Power Keepers gồm 64 Booster Pack. Giá sỉ cực tốt.",
            "sourceSetId": "ex16",
            "generation": "GENERATION III"
        },
        "pack_dpp": {
            "id": "pack_dpp",
            "name": "DP Black Star Promos Booster Pack",
            "buyPrice": 1.67,
            "sellPrice": 2.67,
            "requiredLevel": 21,
            "type": "pack",
            "volume": 1,
            "description": "Pack của bộ DP Black Star Promos. Thế hệ: GENERATION IV.",
            "sourceSetId": "dpp",
            "generation": "GENERATION IV"
        },
        "box_dpp": {
            "id": "box_dpp",
            "name": "DP Black Star Promos Booster Box (64 Packs)",
            "buyPrice": 90.85,
            "sellPrice": 149.63,
            "requiredLevel": 21,
            "type": "box",
            "volume": 16,
            "contains": {
                "itemId": "pack_dpp",
                "amount": 64
            },
            "description": "Hộp DP Black Star Promos gồm 64 Booster Pack. Giá sỉ cực tốt.",
            "sourceSetId": "dpp",
            "generation": "GENERATION IV"
        },
        "pack_dp1": {
            "id": "pack_dp1",
            "name": "Diamond & Pearl Booster Pack",
            "buyPrice": 1.67,
            "sellPrice": 2.67,
            "requiredLevel": 21,
            "type": "pack",
            "volume": 1,
            "description": "Pack của bộ Diamond & Pearl. Thế hệ: GENERATION IV.",
            "sourceSetId": "dp1",
            "generation": "GENERATION IV"
        },
        "box_dp1": {
            "id": "box_dp1",
            "name": "Diamond & Pearl Booster Box (64 Packs)",
            "buyPrice": 90.85,
            "sellPrice": 149.63,
            "requiredLevel": 21,
            "type": "box",
            "volume": 16,
            "contains": {
                "itemId": "pack_dp1",
                "amount": 64
            },
            "description": "Hộp Diamond & Pearl gồm 64 Booster Pack. Giá sỉ cực tốt.",
            "sourceSetId": "dp1",
            "generation": "GENERATION IV"
        },
        "pack_dp2": {
            "id": "pack_dp2",
            "name": "Mysterious Treasures Booster Pack",
            "buyPrice": 1.27,
            "sellPrice": 2.03,
            "requiredLevel": 21,
            "type": "pack",
            "volume": 1,
            "description": "Pack của bộ Mysterious Treasures. Thế hệ: GENERATION IV.",
            "sourceSetId": "dp2",
            "generation": "GENERATION IV"
        },
        "box_dp2": {
            "id": "box_dp2",
            "name": "Mysterious Treasures Booster Box (64 Packs)",
            "buyPrice": 69.09,
            "sellPrice": 113.79,
            "requiredLevel": 21,
            "type": "box",
            "volume": 16,
            "contains": {
                "itemId": "pack_dp2",
                "amount": 64
            },
            "description": "Hộp Mysterious Treasures gồm 64 Booster Pack. Giá sỉ cực tốt.",
            "sourceSetId": "dp2",
            "generation": "GENERATION IV"
        },
        "pack_dp3": {
            "id": "pack_dp3",
            "name": "Secret Wonders Booster Pack",
            "buyPrice": 1.39,
            "sellPrice": 2.22,
            "requiredLevel": 21,
            "type": "pack",
            "volume": 1,
            "description": "Pack của bộ Secret Wonders. Thế hệ: GENERATION IV.",
            "sourceSetId": "dp3",
            "generation": "GENERATION IV"
        },
        "box_dp3": {
            "id": "box_dp3",
            "name": "Secret Wonders Booster Box (64 Packs)",
            "buyPrice": 75.62,
            "sellPrice": 124.54,
            "requiredLevel": 21,
            "type": "box",
            "volume": 16,
            "contains": {
                "itemId": "pack_dp3",
                "amount": 64
            },
            "description": "Hộp Secret Wonders gồm 64 Booster Pack. Giá sỉ cực tốt.",
            "sourceSetId": "dp3",
            "generation": "GENERATION IV"
        },
        "pack_dp4": {
            "id": "pack_dp4",
            "name": "Great Encounters Booster Pack",
            "buyPrice": 1.38,
            "sellPrice": 2.21,
            "requiredLevel": 21,
            "type": "pack",
            "volume": 1,
            "description": "Pack của bộ Great Encounters. Thế hệ: GENERATION IV.",
            "sourceSetId": "dp4",
            "generation": "GENERATION IV"
        },
        "box_dp4": {
            "id": "box_dp4",
            "name": "Great Encounters Booster Box (64 Packs)",
            "buyPrice": 75.07,
            "sellPrice": 123.65,
            "requiredLevel": 21,
            "type": "box",
            "volume": 16,
            "contains": {
                "itemId": "pack_dp4",
                "amount": 64
            },
            "description": "Hộp Great Encounters gồm 64 Booster Pack. Giá sỉ cực tốt.",
            "sourceSetId": "dp4",
            "generation": "GENERATION IV"
        },
        "pack_dp5": {
            "id": "pack_dp5",
            "name": "Majestic Dawn Booster Pack",
            "buyPrice": 1.68,
            "sellPrice": 2.69,
            "requiredLevel": 21,
            "type": "pack",
            "volume": 1,
            "description": "Pack của bộ Majestic Dawn. Thế hệ: GENERATION IV.",
            "sourceSetId": "dp5",
            "generation": "GENERATION IV"
        },
        "box_dp5": {
            "id": "box_dp5",
            "name": "Majestic Dawn Booster Box (64 Packs)",
            "buyPrice": 91.39,
            "sellPrice": 150.53,
            "requiredLevel": 21,
            "type": "box",
            "volume": 16,
            "contains": {
                "itemId": "pack_dp5",
                "amount": 64
            },
            "description": "Hộp Majestic Dawn gồm 64 Booster Pack. Giá sỉ cực tốt.",
            "sourceSetId": "dp5",
            "generation": "GENERATION IV"
        },
        "pack_dp6": {
            "id": "pack_dp6",
            "name": "Legends Awakened Booster Pack",
            "buyPrice": 1.4,
            "sellPrice": 2.24,
            "requiredLevel": 21,
            "type": "pack",
            "volume": 1,
            "description": "Pack của bộ Legends Awakened. Thế hệ: GENERATION IV.",
            "sourceSetId": "dp6",
            "generation": "GENERATION IV"
        },
        "box_dp6": {
            "id": "box_dp6",
            "name": "Legends Awakened Booster Box (64 Packs)",
            "buyPrice": 76.16,
            "sellPrice": 125.44,
            "requiredLevel": 21,
            "type": "box",
            "volume": 16,
            "contains": {
                "itemId": "pack_dp6",
                "amount": 64
            },
            "description": "Hộp Legends Awakened gồm 64 Booster Pack. Giá sỉ cực tốt.",
            "sourceSetId": "dp6",
            "generation": "GENERATION IV"
        },
        "pack_dp7": {
            "id": "pack_dp7",
            "name": "Stormfront Booster Pack",
            "buyPrice": 1.83,
            "sellPrice": 2.93,
            "requiredLevel": 21,
            "type": "pack",
            "volume": 1,
            "description": "Pack của bộ Stormfront. Thế hệ: GENERATION IV.",
            "sourceSetId": "dp7",
            "generation": "GENERATION IV"
        },
        "box_dp7": {
            "id": "box_dp7",
            "name": "Stormfront Booster Box (64 Packs)",
            "buyPrice": 99.55,
            "sellPrice": 163.97,
            "requiredLevel": 21,
            "type": "box",
            "volume": 16,
            "contains": {
                "itemId": "pack_dp7",
                "amount": 64
            },
            "description": "Hộp Stormfront gồm 64 Booster Pack. Giá sỉ cực tốt.",
            "sourceSetId": "dp7",
            "generation": "GENERATION IV"
        },
        "pack_bw1": {
            "id": "pack_bw1",
            "name": "Black & White Booster Pack",
            "buyPrice": 1.48,
            "sellPrice": 2.37,
            "requiredLevel": 31,
            "type": "pack",
            "volume": 1,
            "description": "Pack của bộ Black & White. Thế hệ: GENERATION V.",
            "sourceSetId": "bw1",
            "generation": "GENERATION V"
        },
        "box_bw1": {
            "id": "box_bw1",
            "name": "Black & White Booster Box (64 Packs)",
            "buyPrice": 80.51,
            "sellPrice": 132.61,
            "requiredLevel": 31,
            "type": "box",
            "volume": 16,
            "contains": {
                "itemId": "pack_bw1",
                "amount": 64
            },
            "description": "Hộp Black & White gồm 64 Booster Pack. Giá sỉ cực tốt.",
            "sourceSetId": "bw1",
            "generation": "GENERATION V"
        },
        "pack_bwp": {
            "id": "pack_bwp",
            "name": "BW Black Star Promos Booster Pack",
            "buyPrice": 1.32,
            "sellPrice": 2.11,
            "requiredLevel": 31,
            "type": "pack",
            "volume": 1,
            "description": "Pack của bộ BW Black Star Promos. Thế hệ: GENERATION V.",
            "sourceSetId": "bwp",
            "generation": "GENERATION V"
        },
        "box_bwp": {
            "id": "box_bwp",
            "name": "BW Black Star Promos Booster Box (64 Packs)",
            "buyPrice": 71.81,
            "sellPrice": 118.27,
            "requiredLevel": 31,
            "type": "box",
            "volume": 16,
            "contains": {
                "itemId": "pack_bwp",
                "amount": 64
            },
            "description": "Hộp BW Black Star Promos gồm 64 Booster Pack. Giá sỉ cực tốt.",
            "sourceSetId": "bwp",
            "generation": "GENERATION V"
        },
        "pack_bw2": {
            "id": "pack_bw2",
            "name": "Emerging Powers Booster Pack",
            "buyPrice": 1.67,
            "sellPrice": 2.67,
            "requiredLevel": 31,
            "type": "pack",
            "volume": 1,
            "description": "Pack của bộ Emerging Powers. Thế hệ: GENERATION V.",
            "sourceSetId": "bw2",
            "generation": "GENERATION V"
        },
        "box_bw2": {
            "id": "box_bw2",
            "name": "Emerging Powers Booster Box (64 Packs)",
            "buyPrice": 90.85,
            "sellPrice": 149.63,
            "requiredLevel": 31,
            "type": "box",
            "volume": 16,
            "contains": {
                "itemId": "pack_bw2",
                "amount": 64
            },
            "description": "Hộp Emerging Powers gồm 64 Booster Pack. Giá sỉ cực tốt.",
            "sourceSetId": "bw2",
            "generation": "GENERATION V"
        },
        "pack_bw3": {
            "id": "pack_bw3",
            "name": "Noble Victories Booster Pack",
            "buyPrice": 1.82,
            "sellPrice": 2.91,
            "requiredLevel": 31,
            "type": "pack",
            "volume": 1,
            "description": "Pack của bộ Noble Victories. Thế hệ: GENERATION V.",
            "sourceSetId": "bw3",
            "generation": "GENERATION V"
        },
        "box_bw3": {
            "id": "box_bw3",
            "name": "Noble Victories Booster Box (64 Packs)",
            "buyPrice": 99.01,
            "sellPrice": 163.07,
            "requiredLevel": 31,
            "type": "box",
            "volume": 16,
            "contains": {
                "itemId": "pack_bw3",
                "amount": 64
            },
            "description": "Hộp Noble Victories gồm 64 Booster Pack. Giá sỉ cực tốt.",
            "sourceSetId": "bw3",
            "generation": "GENERATION V"
        },
        "pack_bw4": {
            "id": "pack_bw4",
            "name": "Next Destinies Booster Pack",
            "buyPrice": 1.83,
            "sellPrice": 2.93,
            "requiredLevel": 31,
            "type": "pack",
            "volume": 1,
            "description": "Pack của bộ Next Destinies. Thế hệ: GENERATION V.",
            "sourceSetId": "bw4",
            "generation": "GENERATION V"
        },
        "box_bw4": {
            "id": "box_bw4",
            "name": "Next Destinies Booster Box (64 Packs)",
            "buyPrice": 99.55,
            "sellPrice": 163.97,
            "requiredLevel": 31,
            "type": "box",
            "volume": 16,
            "contains": {
                "itemId": "pack_bw4",
                "amount": 64
            },
            "description": "Hộp Next Destinies gồm 64 Booster Pack. Giá sỉ cực tốt.",
            "sourceSetId": "bw4",
            "generation": "GENERATION V"
        },
        "pack_bw5": {
            "id": "pack_bw5",
            "name": "Dark Explorers Booster Pack",
            "buyPrice": 1.66,
            "sellPrice": 2.66,
            "requiredLevel": 31,
            "type": "pack",
            "volume": 1,
            "description": "Pack của bộ Dark Explorers. Thế hệ: GENERATION V.",
            "sourceSetId": "bw5",
            "generation": "GENERATION V"
        },
        "box_bw5": {
            "id": "box_bw5",
            "name": "Dark Explorers Booster Box (64 Packs)",
            "buyPrice": 90.3,
            "sellPrice": 148.74,
            "requiredLevel": 31,
            "type": "box",
            "volume": 16,
            "contains": {
                "itemId": "pack_bw5",
                "amount": 64
            },
            "description": "Hộp Dark Explorers gồm 64 Booster Pack. Giá sỉ cực tốt.",
            "sourceSetId": "bw5",
            "generation": "GENERATION V"
        },
        "pack_bw6": {
            "id": "pack_bw6",
            "name": "Dragons Exalted Booster Pack",
            "buyPrice": 1.52,
            "sellPrice": 2.43,
            "requiredLevel": 31,
            "type": "pack",
            "volume": 1,
            "description": "Pack của bộ Dragons Exalted. Thế hệ: GENERATION V.",
            "sourceSetId": "bw6",
            "generation": "GENERATION V"
        },
        "box_bw6": {
            "id": "box_bw6",
            "name": "Dragons Exalted Booster Box (64 Packs)",
            "buyPrice": 82.69,
            "sellPrice": 136.19,
            "requiredLevel": 31,
            "type": "box",
            "volume": 16,
            "contains": {
                "itemId": "pack_bw6",
                "amount": 64
            },
            "description": "Hộp Dragons Exalted gồm 64 Booster Pack. Giá sỉ cực tốt.",
            "sourceSetId": "bw6",
            "generation": "GENERATION V"
        },
        "pack_dv1": {
            "id": "pack_dv1",
            "name": "Dragon Vault Booster Pack",
            "buyPrice": 1.37,
            "sellPrice": 2.19,
            "requiredLevel": 31,
            "type": "pack",
            "volume": 1,
            "description": "Pack của bộ Dragon Vault. Thế hệ: GENERATION V.",
            "sourceSetId": "dv1",
            "generation": "GENERATION V"
        },
        "box_dv1": {
            "id": "box_dv1",
            "name": "Dragon Vault Booster Box (64 Packs)",
            "buyPrice": 74.53,
            "sellPrice": 122.75,
            "requiredLevel": 31,
            "type": "box",
            "volume": 16,
            "contains": {
                "itemId": "pack_dv1",
                "amount": 64
            },
            "description": "Hộp Dragon Vault gồm 64 Booster Pack. Giá sỉ cực tốt.",
            "sourceSetId": "dv1",
            "generation": "GENERATION V"
        },
        "pack_bw7": {
            "id": "pack_bw7",
            "name": "Boundaries Crossed Booster Pack",
            "buyPrice": 1.68,
            "sellPrice": 2.69,
            "requiredLevel": 31,
            "type": "pack",
            "volume": 1,
            "description": "Pack của bộ Boundaries Crossed. Thế hệ: GENERATION V.",
            "sourceSetId": "bw7",
            "generation": "GENERATION V"
        },
        "box_bw7": {
            "id": "box_bw7",
            "name": "Boundaries Crossed Booster Box (64 Packs)",
            "buyPrice": 91.39,
            "sellPrice": 150.53,
            "requiredLevel": 31,
            "type": "box",
            "volume": 16,
            "contains": {
                "itemId": "pack_bw7",
                "amount": 64
            },
            "description": "Hộp Boundaries Crossed gồm 64 Booster Pack. Giá sỉ cực tốt.",
            "sourceSetId": "bw7",
            "generation": "GENERATION V"
        },
        "pack_bw8": {
            "id": "pack_bw8",
            "name": "Plasma Storm Booster Pack",
            "buyPrice": 1.38,
            "sellPrice": 2.21,
            "requiredLevel": 31,
            "type": "pack",
            "volume": 1,
            "description": "Pack của bộ Plasma Storm. Thế hệ: GENERATION V.",
            "sourceSetId": "bw8",
            "generation": "GENERATION V"
        },
        "box_bw8": {
            "id": "box_bw8",
            "name": "Plasma Storm Booster Box (64 Packs)",
            "buyPrice": 75.07,
            "sellPrice": 123.65,
            "requiredLevel": 31,
            "type": "box",
            "volume": 16,
            "contains": {
                "itemId": "pack_bw8",
                "amount": 64
            },
            "description": "Hộp Plasma Storm gồm 64 Booster Pack. Giá sỉ cực tốt.",
            "sourceSetId": "bw8",
            "generation": "GENERATION V"
        },
        "pack_bw9": {
            "id": "pack_bw9",
            "name": "Plasma Freeze Booster Pack",
            "buyPrice": 1.37,
            "sellPrice": 2.19,
            "requiredLevel": 31,
            "type": "pack",
            "volume": 1,
            "description": "Pack của bộ Plasma Freeze. Thế hệ: GENERATION V.",
            "sourceSetId": "bw9",
            "generation": "GENERATION V"
        },
        "box_bw9": {
            "id": "box_bw9",
            "name": "Plasma Freeze Booster Box (64 Packs)",
            "buyPrice": 74.53,
            "sellPrice": 122.75,
            "requiredLevel": 31,
            "type": "box",
            "volume": 16,
            "contains": {
                "itemId": "pack_bw9",
                "amount": 64
            },
            "description": "Hộp Plasma Freeze gồm 64 Booster Pack. Giá sỉ cực tốt.",
            "sourceSetId": "bw9",
            "generation": "GENERATION V"
        },
        "pack_bw10": {
            "id": "pack_bw10",
            "name": "Plasma Blast Booster Pack",
            "buyPrice": 1.63,
            "sellPrice": 2.61,
            "requiredLevel": 31,
            "type": "pack",
            "volume": 1,
            "description": "Pack của bộ Plasma Blast. Thế hệ: GENERATION V.",
            "sourceSetId": "bw10",
            "generation": "GENERATION V"
        },
        "box_bw10": {
            "id": "box_bw10",
            "name": "Plasma Blast Booster Box (64 Packs)",
            "buyPrice": 88.67,
            "sellPrice": 146.05,
            "requiredLevel": 31,
            "type": "box",
            "volume": 16,
            "contains": {
                "itemId": "pack_bw10",
                "amount": 64
            },
            "description": "Hộp Plasma Blast gồm 64 Booster Pack. Giá sỉ cực tốt.",
            "sourceSetId": "bw10",
            "generation": "GENERATION V"
        },
        "pack_rc": {
            "id": "pack_rc",
            "name": "Radiant Collection Booster Pack",
            "buyPrice": 1.49,
            "sellPrice": 2.38,
            "requiredLevel": 31,
            "type": "pack",
            "volume": 1,
            "description": "Pack của bộ Radiant Collection. Thế hệ: GENERATION V.",
            "sourceSetId": "rc",
            "generation": "GENERATION V"
        },
        "box_rc": {
            "id": "box_rc",
            "name": "Radiant Collection Booster Box (64 Packs)",
            "buyPrice": 81.06,
            "sellPrice": 133.5,
            "requiredLevel": 31,
            "type": "box",
            "volume": 16,
            "contains": {
                "itemId": "pack_rc",
                "amount": 64
            },
            "description": "Hộp Radiant Collection gồm 64 Booster Pack. Giá sỉ cực tốt.",
            "sourceSetId": "rc",
            "generation": "GENERATION V"
        },
        "pack_bw11": {
            "id": "pack_bw11",
            "name": "Legendary Treasures Booster Pack",
            "buyPrice": 1.41,
            "sellPrice": 2.26,
            "requiredLevel": 31,
            "type": "pack",
            "volume": 1,
            "description": "Pack của bộ Legendary Treasures. Thế hệ: GENERATION V.",
            "sourceSetId": "bw11",
            "generation": "GENERATION V"
        },
        "box_bw11": {
            "id": "box_bw11",
            "name": "Legendary Treasures Booster Box (64 Packs)",
            "buyPrice": 76.7,
            "sellPrice": 126.34,
            "requiredLevel": 31,
            "type": "box",
            "volume": 16,
            "contains": {
                "itemId": "pack_bw11",
                "amount": 64
            },
            "description": "Hộp Legendary Treasures gồm 64 Booster Pack. Giá sỉ cực tốt.",
            "sourceSetId": "bw11",
            "generation": "GENERATION V"
        },
        "pack_xyp": {
            "id": "pack_xyp",
            "name": "XY Black Star Promos Booster Pack",
            "buyPrice": 1.59,
            "sellPrice": 2.54,
            "requiredLevel": 41,
            "type": "pack",
            "volume": 1,
            "description": "Pack của bộ XY Black Star Promos. Thế hệ: GENERATION VI.",
            "sourceSetId": "xyp",
            "generation": "GENERATION VI"
        },
        "box_xyp": {
            "id": "box_xyp",
            "name": "XY Black Star Promos Booster Box (64 Packs)",
            "buyPrice": 86.5,
            "sellPrice": 142.46,
            "requiredLevel": 41,
            "type": "box",
            "volume": 16,
            "contains": {
                "itemId": "pack_xyp",
                "amount": 64
            },
            "description": "Hộp XY Black Star Promos gồm 64 Booster Pack. Giá sỉ cực tốt.",
            "sourceSetId": "xyp",
            "generation": "GENERATION VI"
        },
        "pack_xy0": {
            "id": "pack_xy0",
            "name": "Kalos Starter Set Booster Pack",
            "buyPrice": 1.36,
            "sellPrice": 2.18,
            "requiredLevel": 41,
            "type": "pack",
            "volume": 1,
            "description": "Pack của bộ Kalos Starter Set. Thế hệ: GENERATION VI.",
            "sourceSetId": "xy0",
            "generation": "GENERATION VI"
        },
        "box_xy0": {
            "id": "box_xy0",
            "name": "Kalos Starter Set Booster Box (64 Packs)",
            "buyPrice": 73.98,
            "sellPrice": 121.86,
            "requiredLevel": 41,
            "type": "box",
            "volume": 16,
            "contains": {
                "itemId": "pack_xy0",
                "amount": 64
            },
            "description": "Hộp Kalos Starter Set gồm 64 Booster Pack. Giá sỉ cực tốt.",
            "sourceSetId": "xy0",
            "generation": "GENERATION VI"
        },
        "pack_xya": {
            "id": "pack_xya",
            "name": "Yellow A Alternate Booster Pack",
            "buyPrice": 1.48,
            "sellPrice": 2.37,
            "requiredLevel": 41,
            "type": "pack",
            "volume": 1,
            "description": "Pack của bộ Yellow A Alternate. Thế hệ: GENERATION VI.",
            "sourceSetId": "xya",
            "generation": "GENERATION VI"
        },
        "box_xya": {
            "id": "box_xya",
            "name": "Yellow A Alternate Booster Box (64 Packs)",
            "buyPrice": 80.51,
            "sellPrice": 132.61,
            "requiredLevel": 41,
            "type": "box",
            "volume": 16,
            "contains": {
                "itemId": "pack_xya",
                "amount": 64
            },
            "description": "Hộp Yellow A Alternate gồm 64 Booster Pack. Giá sỉ cực tốt.",
            "sourceSetId": "xya",
            "generation": "GENERATION VI"
        },
        "pack_xy1": {
            "id": "pack_xy1",
            "name": "XY Booster Pack",
            "buyPrice": 1.82,
            "sellPrice": 2.91,
            "requiredLevel": 41,
            "type": "pack",
            "volume": 1,
            "description": "Pack của bộ XY. Thế hệ: GENERATION VI.",
            "sourceSetId": "xy1",
            "generation": "GENERATION VI"
        },
        "box_xy1": {
            "id": "box_xy1",
            "name": "XY Booster Box (64 Packs)",
            "buyPrice": 99.01,
            "sellPrice": 163.07,
            "requiredLevel": 41,
            "type": "box",
            "volume": 16,
            "contains": {
                "itemId": "pack_xy1",
                "amount": 64
            },
            "description": "Hộp XY gồm 64 Booster Pack. Giá sỉ cực tốt.",
            "sourceSetId": "xy1",
            "generation": "GENERATION VI"
        },
        "pack_xy2": {
            "id": "pack_xy2",
            "name": "Flashfire Booster Pack",
            "buyPrice": 1.33,
            "sellPrice": 2.13,
            "requiredLevel": 41,
            "type": "pack",
            "volume": 1,
            "description": "Pack của bộ Flashfire. Thế hệ: GENERATION VI.",
            "sourceSetId": "xy2",
            "generation": "GENERATION VI"
        },
        "box_xy2": {
            "id": "box_xy2",
            "name": "Flashfire Booster Box (64 Packs)",
            "buyPrice": 72.35,
            "sellPrice": 119.17,
            "requiredLevel": 41,
            "type": "box",
            "volume": 16,
            "contains": {
                "itemId": "pack_xy2",
                "amount": 64
            },
            "description": "Hộp Flashfire gồm 64 Booster Pack. Giá sỉ cực tốt.",
            "sourceSetId": "xy2",
            "generation": "GENERATION VI"
        },
        "pack_xy3": {
            "id": "pack_xy3",
            "name": "Furious Fists Booster Pack",
            "buyPrice": 1.6,
            "sellPrice": 2.56,
            "requiredLevel": 41,
            "type": "pack",
            "volume": 1,
            "description": "Pack của bộ Furious Fists. Thế hệ: GENERATION VI.",
            "sourceSetId": "xy3",
            "generation": "GENERATION VI"
        },
        "box_xy3": {
            "id": "box_xy3",
            "name": "Furious Fists Booster Box (64 Packs)",
            "buyPrice": 87.04,
            "sellPrice": 143.36,
            "requiredLevel": 41,
            "type": "box",
            "volume": 16,
            "contains": {
                "itemId": "pack_xy3",
                "amount": 64
            },
            "description": "Hộp Furious Fists gồm 64 Booster Pack. Giá sỉ cực tốt.",
            "sourceSetId": "xy3",
            "generation": "GENERATION VI"
        },
        "pack_xy4": {
            "id": "pack_xy4",
            "name": "Phantom Forces Booster Pack",
            "buyPrice": 1.27,
            "sellPrice": 2.03,
            "requiredLevel": 41,
            "type": "pack",
            "volume": 1,
            "description": "Pack của bộ Phantom Forces. Thế hệ: GENERATION VI.",
            "sourceSetId": "xy4",
            "generation": "GENERATION VI"
        },
        "box_xy4": {
            "id": "box_xy4",
            "name": "Phantom Forces Booster Box (64 Packs)",
            "buyPrice": 69.09,
            "sellPrice": 113.79,
            "requiredLevel": 41,
            "type": "box",
            "volume": 16,
            "contains": {
                "itemId": "pack_xy4",
                "amount": 64
            },
            "description": "Hộp Phantom Forces gồm 64 Booster Pack. Giá sỉ cực tốt.",
            "sourceSetId": "xy4",
            "generation": "GENERATION VI"
        },
        "pack_xy5": {
            "id": "pack_xy5",
            "name": "Primal Clash Booster Pack",
            "buyPrice": 1.8,
            "sellPrice": 2.88,
            "requiredLevel": 41,
            "type": "pack",
            "volume": 1,
            "description": "Pack của bộ Primal Clash. Thế hệ: GENERATION VI.",
            "sourceSetId": "xy5",
            "generation": "GENERATION VI"
        },
        "box_xy5": {
            "id": "box_xy5",
            "name": "Primal Clash Booster Box (64 Packs)",
            "buyPrice": 97.92,
            "sellPrice": 161.28,
            "requiredLevel": 41,
            "type": "box",
            "volume": 16,
            "contains": {
                "itemId": "pack_xy5",
                "amount": 64
            },
            "description": "Hộp Primal Clash gồm 64 Booster Pack. Giá sỉ cực tốt.",
            "sourceSetId": "xy5",
            "generation": "GENERATION VI"
        },
        "pack_dc1": {
            "id": "pack_dc1",
            "name": "Double Crisis Booster Pack",
            "buyPrice": 1.55,
            "sellPrice": 2.48,
            "requiredLevel": 41,
            "type": "pack",
            "volume": 1,
            "description": "Pack của bộ Double Crisis. Thế hệ: GENERATION VI.",
            "sourceSetId": "dc1",
            "generation": "GENERATION VI"
        },
        "box_dc1": {
            "id": "box_dc1",
            "name": "Double Crisis Booster Box (64 Packs)",
            "buyPrice": 84.32,
            "sellPrice": 138.88,
            "requiredLevel": 41,
            "type": "box",
            "volume": 16,
            "contains": {
                "itemId": "pack_dc1",
                "amount": 64
            },
            "description": "Hộp Double Crisis gồm 64 Booster Pack. Giá sỉ cực tốt.",
            "sourceSetId": "dc1",
            "generation": "GENERATION VI"
        },
        "pack_xy6": {
            "id": "pack_xy6",
            "name": "Roaring Skies Booster Pack",
            "buyPrice": 1.35,
            "sellPrice": 2.16,
            "requiredLevel": 41,
            "type": "pack",
            "volume": 1,
            "description": "Pack của bộ Roaring Skies. Thế hệ: GENERATION VI.",
            "sourceSetId": "xy6",
            "generation": "GENERATION VI"
        },
        "box_xy6": {
            "id": "box_xy6",
            "name": "Roaring Skies Booster Box (64 Packs)",
            "buyPrice": 73.44,
            "sellPrice": 120.96,
            "requiredLevel": 41,
            "type": "box",
            "volume": 16,
            "contains": {
                "itemId": "pack_xy6",
                "amount": 64
            },
            "description": "Hộp Roaring Skies gồm 64 Booster Pack. Giá sỉ cực tốt.",
            "sourceSetId": "xy6",
            "generation": "GENERATION VI"
        },
        "pack_xy7": {
            "id": "pack_xy7",
            "name": "Ancient Origins Booster Pack",
            "buyPrice": 1.68,
            "sellPrice": 2.69,
            "requiredLevel": 41,
            "type": "pack",
            "volume": 1,
            "description": "Pack của bộ Ancient Origins. Thế hệ: GENERATION VI.",
            "sourceSetId": "xy7",
            "generation": "GENERATION VI"
        },
        "box_xy7": {
            "id": "box_xy7",
            "name": "Ancient Origins Booster Box (64 Packs)",
            "buyPrice": 91.39,
            "sellPrice": 150.53,
            "requiredLevel": 41,
            "type": "box",
            "volume": 16,
            "contains": {
                "itemId": "pack_xy7",
                "amount": 64
            },
            "description": "Hộp Ancient Origins gồm 64 Booster Pack. Giá sỉ cực tốt.",
            "sourceSetId": "xy7",
            "generation": "GENERATION VI"
        },
        "pack_xy8": {
            "id": "pack_xy8",
            "name": "BREAKthrough Booster Pack",
            "buyPrice": 1.6,
            "sellPrice": 2.56,
            "requiredLevel": 41,
            "type": "pack",
            "volume": 1,
            "description": "Pack của bộ BREAKthrough. Thế hệ: GENERATION VI.",
            "sourceSetId": "xy8",
            "generation": "GENERATION VI"
        },
        "box_xy8": {
            "id": "box_xy8",
            "name": "BREAKthrough Booster Box (64 Packs)",
            "buyPrice": 87.04,
            "sellPrice": 143.36,
            "requiredLevel": 41,
            "type": "box",
            "volume": 16,
            "contains": {
                "itemId": "pack_xy8",
                "amount": 64
            },
            "description": "Hộp BREAKthrough gồm 64 Booster Pack. Giá sỉ cực tốt.",
            "sourceSetId": "xy8",
            "generation": "GENERATION VI"
        },
        "pack_xy9": {
            "id": "pack_xy9",
            "name": "BREAKpoint Booster Pack",
            "buyPrice": 1.55,
            "sellPrice": 2.48,
            "requiredLevel": 41,
            "type": "pack",
            "volume": 1,
            "description": "Pack của bộ BREAKpoint. Thế hệ: GENERATION VI.",
            "sourceSetId": "xy9",
            "generation": "GENERATION VI"
        },
        "box_xy9": {
            "id": "box_xy9",
            "name": "BREAKpoint Booster Box (64 Packs)",
            "buyPrice": 84.32,
            "sellPrice": 138.88,
            "requiredLevel": 41,
            "type": "box",
            "volume": 16,
            "contains": {
                "itemId": "pack_xy9",
                "amount": 64
            },
            "description": "Hộp BREAKpoint gồm 64 Booster Pack. Giá sỉ cực tốt.",
            "sourceSetId": "xy9",
            "generation": "GENERATION VI"
        },
        "pack_g1": {
            "id": "pack_g1",
            "name": "Generations Booster Pack",
            "buyPrice": 1.49,
            "sellPrice": 2.38,
            "requiredLevel": 41,
            "type": "pack",
            "volume": 1,
            "description": "Pack của bộ Generations. Thế hệ: GENERATION VI.",
            "sourceSetId": "g1",
            "generation": "GENERATION VI"
        },
        "box_g1": {
            "id": "box_g1",
            "name": "Generations Booster Box (64 Packs)",
            "buyPrice": 81.06,
            "sellPrice": 133.5,
            "requiredLevel": 41,
            "type": "box",
            "volume": 16,
            "contains": {
                "itemId": "pack_g1",
                "amount": 64
            },
            "description": "Hộp Generations gồm 64 Booster Pack. Giá sỉ cực tốt.",
            "sourceSetId": "g1",
            "generation": "GENERATION VI"
        },
        "pack_xy10": {
            "id": "pack_xy10",
            "name": "Fates Collide Booster Pack",
            "buyPrice": 1.32,
            "sellPrice": 2.11,
            "requiredLevel": 41,
            "type": "pack",
            "volume": 1,
            "description": "Pack của bộ Fates Collide. Thế hệ: GENERATION VI.",
            "sourceSetId": "xy10",
            "generation": "GENERATION VI"
        },
        "box_xy10": {
            "id": "box_xy10",
            "name": "Fates Collide Booster Box (64 Packs)",
            "buyPrice": 71.81,
            "sellPrice": 118.27,
            "requiredLevel": 41,
            "type": "box",
            "volume": 16,
            "contains": {
                "itemId": "pack_xy10",
                "amount": 64
            },
            "description": "Hộp Fates Collide gồm 64 Booster Pack. Giá sỉ cực tốt.",
            "sourceSetId": "xy10",
            "generation": "GENERATION VI"
        },
        "pack_xy11": {
            "id": "pack_xy11",
            "name": "Steam Siege Booster Pack",
            "buyPrice": 1.65,
            "sellPrice": 2.64,
            "requiredLevel": 41,
            "type": "pack",
            "volume": 1,
            "description": "Pack của bộ Steam Siege. Thế hệ: GENERATION VI.",
            "sourceSetId": "xy11",
            "generation": "GENERATION VI"
        },
        "box_xy11": {
            "id": "box_xy11",
            "name": "Steam Siege Booster Box (64 Packs)",
            "buyPrice": 89.76,
            "sellPrice": 147.84,
            "requiredLevel": 41,
            "type": "box",
            "volume": 16,
            "contains": {
                "itemId": "pack_xy11",
                "amount": 64
            },
            "description": "Hộp Steam Siege gồm 64 Booster Pack. Giá sỉ cực tốt.",
            "sourceSetId": "xy11",
            "generation": "GENERATION VI"
        },
        "pack_xy12": {
            "id": "pack_xy12",
            "name": "Evolutions Booster Pack",
            "buyPrice": 1.39,
            "sellPrice": 2.22,
            "requiredLevel": 41,
            "type": "pack",
            "volume": 1,
            "description": "Pack của bộ Evolutions. Thế hệ: GENERATION VI.",
            "sourceSetId": "xy12",
            "generation": "GENERATION VI"
        },
        "box_xy12": {
            "id": "box_xy12",
            "name": "Evolutions Booster Box (64 Packs)",
            "buyPrice": 75.62,
            "sellPrice": 124.54,
            "requiredLevel": 41,
            "type": "box",
            "volume": 16,
            "contains": {
                "itemId": "pack_xy12",
                "amount": 64
            },
            "description": "Hộp Evolutions gồm 64 Booster Pack. Giá sỉ cực tốt.",
            "sourceSetId": "xy12",
            "generation": "GENERATION VI"
        },
        "pack_smp": {
            "id": "pack_smp",
            "name": "SM Black Star Promos Booster Pack",
            "buyPrice": 1.39,
            "sellPrice": 2.22,
            "requiredLevel": 51,
            "type": "pack",
            "volume": 1,
            "description": "Pack của bộ SM Black Star Promos. Thế hệ: GENERATION VII.",
            "sourceSetId": "smp",
            "generation": "GENERATION VII"
        },
        "box_smp": {
            "id": "box_smp",
            "name": "SM Black Star Promos Booster Box (64 Packs)",
            "buyPrice": 75.62,
            "sellPrice": 124.54,
            "requiredLevel": 51,
            "type": "box",
            "volume": 16,
            "contains": {
                "itemId": "pack_smp",
                "amount": 64
            },
            "description": "Hộp SM Black Star Promos gồm 64 Booster Pack. Giá sỉ cực tốt.",
            "sourceSetId": "smp",
            "generation": "GENERATION VII"
        },
        "pack_sm1": {
            "id": "pack_sm1",
            "name": "Sun & Moon Booster Pack",
            "buyPrice": 1.8,
            "sellPrice": 2.88,
            "requiredLevel": 51,
            "type": "pack",
            "volume": 1,
            "description": "Pack của bộ Sun & Moon. Thế hệ: GENERATION VII.",
            "sourceSetId": "sm1",
            "generation": "GENERATION VII"
        },
        "box_sm1": {
            "id": "box_sm1",
            "name": "Sun & Moon Booster Box (64 Packs)",
            "buyPrice": 97.92,
            "sellPrice": 161.28,
            "requiredLevel": 51,
            "type": "box",
            "volume": 16,
            "contains": {
                "itemId": "pack_sm1",
                "amount": 64
            },
            "description": "Hộp Sun & Moon gồm 64 Booster Pack. Giá sỉ cực tốt.",
            "sourceSetId": "sm1",
            "generation": "GENERATION VII"
        },
        "pack_sm2": {
            "id": "pack_sm2",
            "name": "Guardians Rising Booster Pack",
            "buyPrice": 1.52,
            "sellPrice": 2.43,
            "requiredLevel": 51,
            "type": "pack",
            "volume": 1,
            "description": "Pack của bộ Guardians Rising. Thế hệ: GENERATION VII.",
            "sourceSetId": "sm2",
            "generation": "GENERATION VII"
        },
        "box_sm2": {
            "id": "box_sm2",
            "name": "Guardians Rising Booster Box (64 Packs)",
            "buyPrice": 82.69,
            "sellPrice": 136.19,
            "requiredLevel": 51,
            "type": "box",
            "volume": 16,
            "contains": {
                "itemId": "pack_sm2",
                "amount": 64
            },
            "description": "Hộp Guardians Rising gồm 64 Booster Pack. Giá sỉ cực tốt.",
            "sourceSetId": "sm2",
            "generation": "GENERATION VII"
        },
        "pack_sm3": {
            "id": "pack_sm3",
            "name": "Burning Shadows Booster Pack",
            "buyPrice": 1.81,
            "sellPrice": 2.9,
            "requiredLevel": 51,
            "type": "pack",
            "volume": 1,
            "description": "Pack của bộ Burning Shadows. Thế hệ: GENERATION VII.",
            "sourceSetId": "sm3",
            "generation": "GENERATION VII"
        },
        "box_sm3": {
            "id": "box_sm3",
            "name": "Burning Shadows Booster Box (64 Packs)",
            "buyPrice": 98.46,
            "sellPrice": 162.18,
            "requiredLevel": 51,
            "type": "box",
            "volume": 16,
            "contains": {
                "itemId": "pack_sm3",
                "amount": 64
            },
            "description": "Hộp Burning Shadows gồm 64 Booster Pack. Giá sỉ cực tốt.",
            "sourceSetId": "sm3",
            "generation": "GENERATION VII"
        },
        "pack_sm3_5": {
            "id": "pack_sm3_5",
            "name": "Shining Legends Booster Pack",
            "buyPrice": 1.7,
            "sellPrice": 2.72,
            "requiredLevel": 51,
            "type": "pack",
            "volume": 1,
            "description": "Pack của bộ Shining Legends. Thế hệ: GENERATION VII.",
            "sourceSetId": "sm3.5",
            "generation": "GENERATION VII"
        },
        "box_sm3_5": {
            "id": "box_sm3_5",
            "name": "Shining Legends Booster Box (64 Packs)",
            "buyPrice": 92.48,
            "sellPrice": 152.32,
            "requiredLevel": 51,
            "type": "box",
            "volume": 16,
            "contains": {
                "itemId": "pack_sm3_5",
                "amount": 64
            },
            "description": "Hộp Shining Legends gồm 64 Booster Pack. Giá sỉ cực tốt.",
            "sourceSetId": "sm3.5",
            "generation": "GENERATION VII"
        },
        "pack_sm4": {
            "id": "pack_sm4",
            "name": "Crimson Invasion Booster Pack",
            "buyPrice": 1.47,
            "sellPrice": 2.35,
            "requiredLevel": 51,
            "type": "pack",
            "volume": 1,
            "description": "Pack của bộ Crimson Invasion. Thế hệ: GENERATION VII.",
            "sourceSetId": "sm4",
            "generation": "GENERATION VII"
        },
        "box_sm4": {
            "id": "box_sm4",
            "name": "Crimson Invasion Booster Box (64 Packs)",
            "buyPrice": 79.97,
            "sellPrice": 131.71,
            "requiredLevel": 51,
            "type": "box",
            "volume": 16,
            "contains": {
                "itemId": "pack_sm4",
                "amount": 64
            },
            "description": "Hộp Crimson Invasion gồm 64 Booster Pack. Giá sỉ cực tốt.",
            "sourceSetId": "sm4",
            "generation": "GENERATION VII"
        },
        "pack_sm5": {
            "id": "pack_sm5",
            "name": "Ultra Prism Booster Pack",
            "buyPrice": 1.44,
            "sellPrice": 2.3,
            "requiredLevel": 51,
            "type": "pack",
            "volume": 1,
            "description": "Pack của bộ Ultra Prism. Thế hệ: GENERATION VII.",
            "sourceSetId": "sm5",
            "generation": "GENERATION VII"
        },
        "box_sm5": {
            "id": "box_sm5",
            "name": "Ultra Prism Booster Box (64 Packs)",
            "buyPrice": 78.34,
            "sellPrice": 129.02,
            "requiredLevel": 51,
            "type": "box",
            "volume": 16,
            "contains": {
                "itemId": "pack_sm5",
                "amount": 64
            },
            "description": "Hộp Ultra Prism gồm 64 Booster Pack. Giá sỉ cực tốt.",
            "sourceSetId": "sm5",
            "generation": "GENERATION VII"
        },
        "pack_sm6": {
            "id": "pack_sm6",
            "name": "Forbidden Light Booster Pack",
            "buyPrice": 1.73,
            "sellPrice": 2.77,
            "requiredLevel": 51,
            "type": "pack",
            "volume": 1,
            "description": "Pack của bộ Forbidden Light. Thế hệ: GENERATION VII.",
            "sourceSetId": "sm6",
            "generation": "GENERATION VII"
        },
        "box_sm6": {
            "id": "box_sm6",
            "name": "Forbidden Light Booster Box (64 Packs)",
            "buyPrice": 94.11,
            "sellPrice": 155.01,
            "requiredLevel": 51,
            "type": "box",
            "volume": 16,
            "contains": {
                "itemId": "pack_sm6",
                "amount": 64
            },
            "description": "Hộp Forbidden Light gồm 64 Booster Pack. Giá sỉ cực tốt.",
            "sourceSetId": "sm6",
            "generation": "GENERATION VII"
        },
        "pack_sm7": {
            "id": "pack_sm7",
            "name": "Celestial Storm Booster Pack",
            "buyPrice": 1.46,
            "sellPrice": 2.34,
            "requiredLevel": 51,
            "type": "pack",
            "volume": 1,
            "description": "Pack của bộ Celestial Storm. Thế hệ: GENERATION VII.",
            "sourceSetId": "sm7",
            "generation": "GENERATION VII"
        },
        "box_sm7": {
            "id": "box_sm7",
            "name": "Celestial Storm Booster Box (64 Packs)",
            "buyPrice": 79.42,
            "sellPrice": 130.82,
            "requiredLevel": 51,
            "type": "box",
            "volume": 16,
            "contains": {
                "itemId": "pack_sm7",
                "amount": 64
            },
            "description": "Hộp Celestial Storm gồm 64 Booster Pack. Giá sỉ cực tốt.",
            "sourceSetId": "sm7",
            "generation": "GENERATION VII"
        },
        "pack_sm7_5": {
            "id": "pack_sm7_5",
            "name": "Dragon Majesty Booster Pack",
            "buyPrice": 1.86,
            "sellPrice": 2.98,
            "requiredLevel": 51,
            "type": "pack",
            "volume": 1,
            "description": "Pack của bộ Dragon Majesty. Thế hệ: GENERATION VII.",
            "sourceSetId": "sm7.5",
            "generation": "GENERATION VII"
        },
        "box_sm7_5": {
            "id": "box_sm7_5",
            "name": "Dragon Majesty Booster Box (64 Packs)",
            "buyPrice": 101.18,
            "sellPrice": 166.66,
            "requiredLevel": 51,
            "type": "box",
            "volume": 16,
            "contains": {
                "itemId": "pack_sm7_5",
                "amount": 64
            },
            "description": "Hộp Dragon Majesty gồm 64 Booster Pack. Giá sỉ cực tốt.",
            "sourceSetId": "sm7.5",
            "generation": "GENERATION VII"
        },
        "pack_sm8": {
            "id": "pack_sm8",
            "name": "Lost Thunder Booster Pack",
            "buyPrice": 1.64,
            "sellPrice": 2.62,
            "requiredLevel": 51,
            "type": "pack",
            "volume": 1,
            "description": "Pack của bộ Lost Thunder. Thế hệ: GENERATION VII.",
            "sourceSetId": "sm8",
            "generation": "GENERATION VII"
        },
        "box_sm8": {
            "id": "box_sm8",
            "name": "Lost Thunder Booster Box (64 Packs)",
            "buyPrice": 89.22,
            "sellPrice": 146.94,
            "requiredLevel": 51,
            "type": "box",
            "volume": 16,
            "contains": {
                "itemId": "pack_sm8",
                "amount": 64
            },
            "description": "Hộp Lost Thunder gồm 64 Booster Pack. Giá sỉ cực tốt.",
            "sourceSetId": "sm8",
            "generation": "GENERATION VII"
        },
        "pack_sm9": {
            "id": "pack_sm9",
            "name": "Team Up Booster Pack",
            "buyPrice": 1.46,
            "sellPrice": 2.34,
            "requiredLevel": 51,
            "type": "pack",
            "volume": 1,
            "description": "Pack của bộ Team Up. Thế hệ: GENERATION VII.",
            "sourceSetId": "sm9",
            "generation": "GENERATION VII"
        },
        "box_sm9": {
            "id": "box_sm9",
            "name": "Team Up Booster Box (64 Packs)",
            "buyPrice": 79.42,
            "sellPrice": 130.82,
            "requiredLevel": 51,
            "type": "box",
            "volume": 16,
            "contains": {
                "itemId": "pack_sm9",
                "amount": 64
            },
            "description": "Hộp Team Up gồm 64 Booster Pack. Giá sỉ cực tốt.",
            "sourceSetId": "sm9",
            "generation": "GENERATION VII"
        },
        "pack_det1": {
            "id": "pack_det1",
            "name": "Detective Pikachu Booster Pack",
            "buyPrice": 1.61,
            "sellPrice": 2.58,
            "requiredLevel": 51,
            "type": "pack",
            "volume": 1,
            "description": "Pack của bộ Detective Pikachu. Thế hệ: GENERATION VII.",
            "sourceSetId": "det1",
            "generation": "GENERATION VII"
        },
        "box_det1": {
            "id": "box_det1",
            "name": "Detective Pikachu Booster Box (64 Packs)",
            "buyPrice": 87.58,
            "sellPrice": 144.26,
            "requiredLevel": 51,
            "type": "box",
            "volume": 16,
            "contains": {
                "itemId": "pack_det1",
                "amount": 64
            },
            "description": "Hộp Detective Pikachu gồm 64 Booster Pack. Giá sỉ cực tốt.",
            "sourceSetId": "det1",
            "generation": "GENERATION VII"
        },
        "pack_sm10": {
            "id": "pack_sm10",
            "name": "Unbroken Bonds Booster Pack",
            "buyPrice": 1.62,
            "sellPrice": 2.59,
            "requiredLevel": 51,
            "type": "pack",
            "volume": 1,
            "description": "Pack của bộ Unbroken Bonds. Thế hệ: GENERATION VII.",
            "sourceSetId": "sm10",
            "generation": "GENERATION VII"
        },
        "box_sm10": {
            "id": "box_sm10",
            "name": "Unbroken Bonds Booster Box (64 Packs)",
            "buyPrice": 88.13,
            "sellPrice": 145.15,
            "requiredLevel": 51,
            "type": "box",
            "volume": 16,
            "contains": {
                "itemId": "pack_sm10",
                "amount": 64
            },
            "description": "Hộp Unbroken Bonds gồm 64 Booster Pack. Giá sỉ cực tốt.",
            "sourceSetId": "sm10",
            "generation": "GENERATION VII"
        },
        "pack_sm11": {
            "id": "pack_sm11",
            "name": "Unified Minds Booster Pack",
            "buyPrice": 1.67,
            "sellPrice": 2.67,
            "requiredLevel": 51,
            "type": "pack",
            "volume": 1,
            "description": "Pack của bộ Unified Minds. Thế hệ: GENERATION VII.",
            "sourceSetId": "sm11",
            "generation": "GENERATION VII"
        },
        "box_sm11": {
            "id": "box_sm11",
            "name": "Unified Minds Booster Box (64 Packs)",
            "buyPrice": 90.85,
            "sellPrice": 149.63,
            "requiredLevel": 51,
            "type": "box",
            "volume": 16,
            "contains": {
                "itemId": "pack_sm11",
                "amount": 64
            },
            "description": "Hộp Unified Minds gồm 64 Booster Pack. Giá sỉ cực tốt.",
            "sourceSetId": "sm11",
            "generation": "GENERATION VII"
        },
        "pack_sm115": {
            "id": "pack_sm115",
            "name": "Hidden Fates Booster Pack",
            "buyPrice": 1.62,
            "sellPrice": 2.59,
            "requiredLevel": 51,
            "type": "pack",
            "volume": 1,
            "description": "Pack của bộ Hidden Fates. Thế hệ: GENERATION VII.",
            "sourceSetId": "sm115",
            "generation": "GENERATION VII"
        },
        "box_sm115": {
            "id": "box_sm115",
            "name": "Hidden Fates Booster Box (64 Packs)",
            "buyPrice": 88.13,
            "sellPrice": 145.15,
            "requiredLevel": 51,
            "type": "box",
            "volume": 16,
            "contains": {
                "itemId": "pack_sm115",
                "amount": 64
            },
            "description": "Hộp Hidden Fates gồm 64 Booster Pack. Giá sỉ cực tốt.",
            "sourceSetId": "sm115",
            "generation": "GENERATION VII"
        },
        "pack_sma": {
            "id": "pack_sma",
            "name": "Hidden Fates Shiny Vault Booster Pack",
            "buyPrice": 1.86,
            "sellPrice": 2.98,
            "requiredLevel": 51,
            "type": "pack",
            "volume": 1,
            "description": "Pack của bộ Hidden Fates Shiny Vault. Thế hệ: GENERATION VII.",
            "sourceSetId": "sma",
            "generation": "GENERATION VII"
        },
        "box_sma": {
            "id": "box_sma",
            "name": "Hidden Fates Shiny Vault Booster Box (64 Packs)",
            "buyPrice": 101.18,
            "sellPrice": 166.66,
            "requiredLevel": 51,
            "type": "box",
            "volume": 16,
            "contains": {
                "itemId": "pack_sma",
                "amount": 64
            },
            "description": "Hộp Hidden Fates Shiny Vault gồm 64 Booster Pack. Giá sỉ cực tốt.",
            "sourceSetId": "sma",
            "generation": "GENERATION VII"
        },
        "pack_sm12": {
            "id": "pack_sm12",
            "name": "Cosmic Eclipse Booster Pack",
            "buyPrice": 1.29,
            "sellPrice": 2.06,
            "requiredLevel": 51,
            "type": "pack",
            "volume": 1,
            "description": "Pack của bộ Cosmic Eclipse. Thế hệ: GENERATION VII.",
            "sourceSetId": "sm12",
            "generation": "GENERATION VII"
        },
        "box_sm12": {
            "id": "box_sm12",
            "name": "Cosmic Eclipse Booster Box (64 Packs)",
            "buyPrice": 70.18,
            "sellPrice": 115.58,
            "requiredLevel": 51,
            "type": "box",
            "volume": 16,
            "contains": {
                "itemId": "pack_sm12",
                "amount": 64
            },
            "description": "Hộp Cosmic Eclipse gồm 64 Booster Pack. Giá sỉ cực tốt.",
            "sourceSetId": "sm12",
            "generation": "GENERATION VII"
        },
        "pack_swshp": {
            "id": "pack_swshp",
            "name": "SWSH Black Star Promos Booster Pack",
            "buyPrice": 1.59,
            "sellPrice": 2.54,
            "requiredLevel": 61,
            "type": "pack",
            "volume": 1,
            "description": "Pack của bộ SWSH Black Star Promos. Thế hệ: GENERATION VIII.",
            "sourceSetId": "swshp",
            "generation": "GENERATION VIII"
        },
        "box_swshp": {
            "id": "box_swshp",
            "name": "SWSH Black Star Promos Booster Box (64 Packs)",
            "buyPrice": 86.5,
            "sellPrice": 142.46,
            "requiredLevel": 61,
            "type": "box",
            "volume": 16,
            "contains": {
                "itemId": "pack_swshp",
                "amount": 64
            },
            "description": "Hộp SWSH Black Star Promos gồm 64 Booster Pack. Giá sỉ cực tốt.",
            "sourceSetId": "swshp",
            "generation": "GENERATION VIII"
        },
        "pack_swsh1": {
            "id": "pack_swsh1",
            "name": "Sword & Shield Booster Pack",
            "buyPrice": 1.79,
            "sellPrice": 2.86,
            "requiredLevel": 61,
            "type": "pack",
            "volume": 1,
            "description": "Pack của bộ Sword & Shield. Thế hệ: GENERATION VIII.",
            "sourceSetId": "swsh1",
            "generation": "GENERATION VIII"
        },
        "box_swsh1": {
            "id": "box_swsh1",
            "name": "Sword & Shield Booster Box (64 Packs)",
            "buyPrice": 97.38,
            "sellPrice": 160.38,
            "requiredLevel": 61,
            "type": "box",
            "volume": 16,
            "contains": {
                "itemId": "pack_swsh1",
                "amount": 64
            },
            "description": "Hộp Sword & Shield gồm 64 Booster Pack. Giá sỉ cực tốt.",
            "sourceSetId": "swsh1",
            "generation": "GENERATION VIII"
        },
        "pack_swsh2": {
            "id": "pack_swsh2",
            "name": "Rebel Clash Booster Pack",
            "buyPrice": 1.7,
            "sellPrice": 2.72,
            "requiredLevel": 61,
            "type": "pack",
            "volume": 1,
            "description": "Pack của bộ Rebel Clash. Thế hệ: GENERATION VIII.",
            "sourceSetId": "swsh2",
            "generation": "GENERATION VIII"
        },
        "box_swsh2": {
            "id": "box_swsh2",
            "name": "Rebel Clash Booster Box (64 Packs)",
            "buyPrice": 92.48,
            "sellPrice": 152.32,
            "requiredLevel": 61,
            "type": "box",
            "volume": 16,
            "contains": {
                "itemId": "pack_swsh2",
                "amount": 64
            },
            "description": "Hộp Rebel Clash gồm 64 Booster Pack. Giá sỉ cực tốt.",
            "sourceSetId": "swsh2",
            "generation": "GENERATION VIII"
        },
        "pack_swsh3": {
            "id": "pack_swsh3",
            "name": "Darkness Ablaze Booster Pack",
            "buyPrice": 1.75,
            "sellPrice": 2.8,
            "requiredLevel": 61,
            "type": "pack",
            "volume": 1,
            "description": "Pack của bộ Darkness Ablaze. Thế hệ: GENERATION VIII.",
            "sourceSetId": "swsh3",
            "generation": "GENERATION VIII"
        },
        "box_swsh3": {
            "id": "box_swsh3",
            "name": "Darkness Ablaze Booster Box (64 Packs)",
            "buyPrice": 95.2,
            "sellPrice": 156.8,
            "requiredLevel": 61,
            "type": "box",
            "volume": 16,
            "contains": {
                "itemId": "pack_swsh3",
                "amount": 64
            },
            "description": "Hộp Darkness Ablaze gồm 64 Booster Pack. Giá sỉ cực tốt.",
            "sourceSetId": "swsh3",
            "generation": "GENERATION VIII"
        },
        "pack_fut2020": {
            "id": "pack_fut2020",
            "name": "Pokémon Futsal 2020 Booster Pack",
            "buyPrice": 1.34,
            "sellPrice": 2.14,
            "requiredLevel": 61,
            "type": "pack",
            "volume": 1,
            "description": "Pack của bộ Pokémon Futsal 2020. Thế hệ: GENERATION VIII.",
            "sourceSetId": "fut2020",
            "generation": "GENERATION VIII"
        },
        "box_fut2020": {
            "id": "box_fut2020",
            "name": "Pokémon Futsal 2020 Booster Box (64 Packs)",
            "buyPrice": 72.9,
            "sellPrice": 120.06,
            "requiredLevel": 61,
            "type": "box",
            "volume": 16,
            "contains": {
                "itemId": "pack_fut2020",
                "amount": 64
            },
            "description": "Hộp Pokémon Futsal 2020 gồm 64 Booster Pack. Giá sỉ cực tốt.",
            "sourceSetId": "fut2020",
            "generation": "GENERATION VIII"
        },
        "pack_swsh3_5": {
            "id": "pack_swsh3_5",
            "name": "Champion's Path Booster Pack",
            "buyPrice": 1.56,
            "sellPrice": 2.5,
            "requiredLevel": 61,
            "type": "pack",
            "volume": 1,
            "description": "Pack của bộ Champion's Path. Thế hệ: GENERATION VIII.",
            "sourceSetId": "swsh3.5",
            "generation": "GENERATION VIII"
        },
        "box_swsh3_5": {
            "id": "box_swsh3_5",
            "name": "Champion's Path Booster Box (64 Packs)",
            "buyPrice": 84.86,
            "sellPrice": 139.78,
            "requiredLevel": 61,
            "type": "box",
            "volume": 16,
            "contains": {
                "itemId": "pack_swsh3_5",
                "amount": 64
            },
            "description": "Hộp Champion's Path gồm 64 Booster Pack. Giá sỉ cực tốt.",
            "sourceSetId": "swsh3.5",
            "generation": "GENERATION VIII"
        },
        "pack_swsh4": {
            "id": "pack_swsh4",
            "name": "Vivid Voltage Booster Pack",
            "buyPrice": 1.7,
            "sellPrice": 2.72,
            "requiredLevel": 61,
            "type": "pack",
            "volume": 1,
            "description": "Pack của bộ Vivid Voltage. Thế hệ: GENERATION VIII.",
            "sourceSetId": "swsh4",
            "generation": "GENERATION VIII"
        },
        "box_swsh4": {
            "id": "box_swsh4",
            "name": "Vivid Voltage Booster Box (64 Packs)",
            "buyPrice": 92.48,
            "sellPrice": 152.32,
            "requiredLevel": 61,
            "type": "box",
            "volume": 16,
            "contains": {
                "itemId": "pack_swsh4",
                "amount": 64
            },
            "description": "Hộp Vivid Voltage gồm 64 Booster Pack. Giá sỉ cực tốt.",
            "sourceSetId": "swsh4",
            "generation": "GENERATION VIII"
        },
        "pack_swsh4_5": {
            "id": "pack_swsh4_5",
            "name": "Shining Fates Booster Pack",
            "buyPrice": 1.31,
            "sellPrice": 2.1,
            "requiredLevel": 61,
            "type": "pack",
            "volume": 1,
            "description": "Pack của bộ Shining Fates. Thế hệ: GENERATION VIII.",
            "sourceSetId": "swsh4.5",
            "generation": "GENERATION VIII"
        },
        "box_swsh4_5": {
            "id": "box_swsh4_5",
            "name": "Shining Fates Booster Box (64 Packs)",
            "buyPrice": 71.26,
            "sellPrice": 117.38,
            "requiredLevel": 61,
            "type": "box",
            "volume": 16,
            "contains": {
                "itemId": "pack_swsh4_5",
                "amount": 64
            },
            "description": "Hộp Shining Fates gồm 64 Booster Pack. Giá sỉ cực tốt.",
            "sourceSetId": "swsh4.5",
            "generation": "GENERATION VIII"
        },
        "pack_swsh5": {
            "id": "pack_swsh5",
            "name": "Battle Styles Booster Pack",
            "buyPrice": 1.78,
            "sellPrice": 2.85,
            "requiredLevel": 61,
            "type": "pack",
            "volume": 1,
            "description": "Pack của bộ Battle Styles. Thế hệ: GENERATION VIII.",
            "sourceSetId": "swsh5",
            "generation": "GENERATION VIII"
        },
        "box_swsh5": {
            "id": "box_swsh5",
            "name": "Battle Styles Booster Box (64 Packs)",
            "buyPrice": 96.83,
            "sellPrice": 159.49,
            "requiredLevel": 61,
            "type": "box",
            "volume": 16,
            "contains": {
                "itemId": "pack_swsh5",
                "amount": 64
            },
            "description": "Hộp Battle Styles gồm 64 Booster Pack. Giá sỉ cực tốt.",
            "sourceSetId": "swsh5",
            "generation": "GENERATION VIII"
        },
        "pack_swsh6": {
            "id": "pack_swsh6",
            "name": "Chilling Reign Booster Pack",
            "buyPrice": 1.7,
            "sellPrice": 2.72,
            "requiredLevel": 61,
            "type": "pack",
            "volume": 1,
            "description": "Pack của bộ Chilling Reign. Thế hệ: GENERATION VIII.",
            "sourceSetId": "swsh6",
            "generation": "GENERATION VIII"
        },
        "box_swsh6": {
            "id": "box_swsh6",
            "name": "Chilling Reign Booster Box (64 Packs)",
            "buyPrice": 92.48,
            "sellPrice": 152.32,
            "requiredLevel": 61,
            "type": "box",
            "volume": 16,
            "contains": {
                "itemId": "pack_swsh6",
                "amount": 64
            },
            "description": "Hộp Chilling Reign gồm 64 Booster Pack. Giá sỉ cực tốt.",
            "sourceSetId": "swsh6",
            "generation": "GENERATION VIII"
        },
        "pack_swsh7": {
            "id": "pack_swsh7",
            "name": "Evolving Skies Booster Pack",
            "buyPrice": 1.65,
            "sellPrice": 2.64,
            "requiredLevel": 61,
            "type": "pack",
            "volume": 1,
            "description": "Pack của bộ Evolving Skies. Thế hệ: GENERATION VIII.",
            "sourceSetId": "swsh7",
            "generation": "GENERATION VIII"
        },
        "box_swsh7": {
            "id": "box_swsh7",
            "name": "Evolving Skies Booster Box (64 Packs)",
            "buyPrice": 89.76,
            "sellPrice": 147.84,
            "requiredLevel": 61,
            "type": "box",
            "volume": 16,
            "contains": {
                "itemId": "pack_swsh7",
                "amount": 64
            },
            "description": "Hộp Evolving Skies gồm 64 Booster Pack. Giá sỉ cực tốt.",
            "sourceSetId": "swsh7",
            "generation": "GENERATION VIII"
        },
        "pack_cel25": {
            "id": "pack_cel25",
            "name": "Celebrations Booster Pack",
            "buyPrice": 1.47,
            "sellPrice": 2.35,
            "requiredLevel": 61,
            "type": "pack",
            "volume": 1,
            "description": "Pack của bộ Celebrations. Thế hệ: GENERATION VIII.",
            "sourceSetId": "cel25",
            "generation": "GENERATION VIII"
        },
        "box_cel25": {
            "id": "box_cel25",
            "name": "Celebrations Booster Box (64 Packs)",
            "buyPrice": 79.97,
            "sellPrice": 131.71,
            "requiredLevel": 61,
            "type": "box",
            "volume": 16,
            "contains": {
                "itemId": "pack_cel25",
                "amount": 64
            },
            "description": "Hộp Celebrations gồm 64 Booster Pack. Giá sỉ cực tốt.",
            "sourceSetId": "cel25",
            "generation": "GENERATION VIII"
        },
        "pack_swsh8": {
            "id": "pack_swsh8",
            "name": "Fusion Strike Booster Pack",
            "buyPrice": 1.59,
            "sellPrice": 2.54,
            "requiredLevel": 61,
            "type": "pack",
            "volume": 1,
            "description": "Pack của bộ Fusion Strike. Thế hệ: GENERATION VIII.",
            "sourceSetId": "swsh8",
            "generation": "GENERATION VIII"
        },
        "box_swsh8": {
            "id": "box_swsh8",
            "name": "Fusion Strike Booster Box (64 Packs)",
            "buyPrice": 86.5,
            "sellPrice": 142.46,
            "requiredLevel": 61,
            "type": "box",
            "volume": 16,
            "contains": {
                "itemId": "pack_swsh8",
                "amount": 64
            },
            "description": "Hộp Fusion Strike gồm 64 Booster Pack. Giá sỉ cực tốt.",
            "sourceSetId": "swsh8",
            "generation": "GENERATION VIII"
        },
        "pack_swsh9": {
            "id": "pack_swsh9",
            "name": "Brilliant Stars Booster Pack",
            "buyPrice": 1.66,
            "sellPrice": 2.66,
            "requiredLevel": 61,
            "type": "pack",
            "volume": 1,
            "description": "Pack của bộ Brilliant Stars. Thế hệ: GENERATION VIII.",
            "sourceSetId": "swsh9",
            "generation": "GENERATION VIII"
        },
        "box_swsh9": {
            "id": "box_swsh9",
            "name": "Brilliant Stars Booster Box (64 Packs)",
            "buyPrice": 90.3,
            "sellPrice": 148.74,
            "requiredLevel": 61,
            "type": "box",
            "volume": 16,
            "contains": {
                "itemId": "pack_swsh9",
                "amount": 64
            },
            "description": "Hộp Brilliant Stars gồm 64 Booster Pack. Giá sỉ cực tốt.",
            "sourceSetId": "swsh9",
            "generation": "GENERATION VIII"
        },
        "pack_swsh10": {
            "id": "pack_swsh10",
            "name": "Astral Radiance Booster Pack",
            "buyPrice": 1.55,
            "sellPrice": 2.48,
            "requiredLevel": 61,
            "type": "pack",
            "volume": 1,
            "description": "Pack của bộ Astral Radiance. Thế hệ: GENERATION VIII.",
            "sourceSetId": "swsh10",
            "generation": "GENERATION VIII"
        },
        "box_swsh10": {
            "id": "box_swsh10",
            "name": "Astral Radiance Booster Box (64 Packs)",
            "buyPrice": 84.32,
            "sellPrice": 138.88,
            "requiredLevel": 61,
            "type": "box",
            "volume": 16,
            "contains": {
                "itemId": "pack_swsh10",
                "amount": 64
            },
            "description": "Hộp Astral Radiance gồm 64 Booster Pack. Giá sỉ cực tốt.",
            "sourceSetId": "swsh10",
            "generation": "GENERATION VIII"
        },
        "pack_swsh10_5": {
            "id": "pack_swsh10_5",
            "name": "Pokémon GO Booster Pack",
            "buyPrice": 1.62,
            "sellPrice": 2.59,
            "requiredLevel": 61,
            "type": "pack",
            "volume": 1,
            "description": "Pack của bộ Pokémon GO. Thế hệ: GENERATION VIII.",
            "sourceSetId": "swsh10.5",
            "generation": "GENERATION VIII"
        },
        "box_swsh10_5": {
            "id": "box_swsh10_5",
            "name": "Pokémon GO Booster Box (64 Packs)",
            "buyPrice": 88.13,
            "sellPrice": 145.15,
            "requiredLevel": 61,
            "type": "box",
            "volume": 16,
            "contains": {
                "itemId": "pack_swsh10_5",
                "amount": 64
            },
            "description": "Hộp Pokémon GO gồm 64 Booster Pack. Giá sỉ cực tốt.",
            "sourceSetId": "swsh10.5",
            "generation": "GENERATION VIII"
        },
        "pack_swsh11": {
            "id": "pack_swsh11",
            "name": "Lost Origin Booster Pack",
            "buyPrice": 1.63,
            "sellPrice": 2.61,
            "requiredLevel": 61,
            "type": "pack",
            "volume": 1,
            "description": "Pack của bộ Lost Origin. Thế hệ: GENERATION VIII.",
            "sourceSetId": "swsh11",
            "generation": "GENERATION VIII"
        },
        "box_swsh11": {
            "id": "box_swsh11",
            "name": "Lost Origin Booster Box (64 Packs)",
            "buyPrice": 88.67,
            "sellPrice": 146.05,
            "requiredLevel": 61,
            "type": "box",
            "volume": 16,
            "contains": {
                "itemId": "pack_swsh11",
                "amount": 64
            },
            "description": "Hộp Lost Origin gồm 64 Booster Pack. Giá sỉ cực tốt.",
            "sourceSetId": "swsh11",
            "generation": "GENERATION VIII"
        },
        "pack_swsh12": {
            "id": "pack_swsh12",
            "name": "Silver Tempest Booster Pack",
            "buyPrice": 1.85,
            "sellPrice": 2.96,
            "requiredLevel": 61,
            "type": "pack",
            "volume": 1,
            "description": "Pack của bộ Silver Tempest. Thế hệ: GENERATION VIII.",
            "sourceSetId": "swsh12",
            "generation": "GENERATION VIII"
        },
        "box_swsh12": {
            "id": "box_swsh12",
            "name": "Silver Tempest Booster Box (64 Packs)",
            "buyPrice": 100.64,
            "sellPrice": 165.76,
            "requiredLevel": 61,
            "type": "box",
            "volume": 16,
            "contains": {
                "itemId": "pack_swsh12",
                "amount": 64
            },
            "description": "Hộp Silver Tempest gồm 64 Booster Pack. Giá sỉ cực tốt.",
            "sourceSetId": "swsh12",
            "generation": "GENERATION VIII"
        },
        "pack_swsh12_5": {
            "id": "pack_swsh12_5",
            "name": "Crown Zenith Booster Pack",
            "buyPrice": 1.69,
            "sellPrice": 2.7,
            "requiredLevel": 61,
            "type": "pack",
            "volume": 1,
            "description": "Pack của bộ Crown Zenith. Thế hệ: GENERATION VIII.",
            "sourceSetId": "swsh12.5",
            "generation": "GENERATION VIII"
        },
        "box_swsh12_5": {
            "id": "box_swsh12_5",
            "name": "Crown Zenith Booster Box (64 Packs)",
            "buyPrice": 91.94,
            "sellPrice": 151.42,
            "requiredLevel": 61,
            "type": "box",
            "volume": 16,
            "contains": {
                "itemId": "pack_swsh12_5",
                "amount": 64
            },
            "description": "Hộp Crown Zenith gồm 64 Booster Pack. Giá sỉ cực tốt.",
            "sourceSetId": "swsh12.5",
            "generation": "GENERATION VIII"
        },
        "pack_sve": {
            "id": "pack_sve",
            "name": "Scarlet & Violet Energy Booster Pack",
            "buyPrice": 1.56,
            "sellPrice": 2.5,
            "requiredLevel": 71,
            "type": "pack",
            "volume": 1,
            "description": "Pack của bộ Scarlet & Violet Energy. Thế hệ: GENERATION IX.",
            "sourceSetId": "sve",
            "generation": "GENERATION IX"
        },
        "box_sve": {
            "id": "box_sve",
            "name": "Scarlet & Violet Energy Booster Box (64 Packs)",
            "buyPrice": 84.86,
            "sellPrice": 139.78,
            "requiredLevel": 71,
            "type": "box",
            "volume": 16,
            "contains": {
                "itemId": "pack_sve",
                "amount": 64
            },
            "description": "Hộp Scarlet & Violet Energy gồm 64 Booster Pack. Giá sỉ cực tốt.",
            "sourceSetId": "sve",
            "generation": "GENERATION IX"
        },
        "pack_svp": {
            "id": "pack_svp",
            "name": "SVP Black Star Promos Booster Pack",
            "buyPrice": 1.43,
            "sellPrice": 2.29,
            "requiredLevel": 71,
            "type": "pack",
            "volume": 1,
            "description": "Pack của bộ SVP Black Star Promos. Thế hệ: GENERATION IX.",
            "sourceSetId": "svp",
            "generation": "GENERATION IX"
        },
        "box_svp": {
            "id": "box_svp",
            "name": "SVP Black Star Promos Booster Box (64 Packs)",
            "buyPrice": 77.79,
            "sellPrice": 128.13,
            "requiredLevel": 71,
            "type": "box",
            "volume": 16,
            "contains": {
                "itemId": "pack_svp",
                "amount": 64
            },
            "description": "Hộp SVP Black Star Promos gồm 64 Booster Pack. Giá sỉ cực tốt.",
            "sourceSetId": "svp",
            "generation": "GENERATION IX"
        },
        "pack_sv01": {
            "id": "pack_sv01",
            "name": "Scarlet & Violet Booster Pack",
            "buyPrice": 1.31,
            "sellPrice": 2.1,
            "requiredLevel": 71,
            "type": "pack",
            "volume": 1,
            "description": "Pack của bộ Scarlet & Violet. Thế hệ: GENERATION IX.",
            "sourceSetId": "sv01",
            "generation": "GENERATION IX"
        },
        "box_sv01": {
            "id": "box_sv01",
            "name": "Scarlet & Violet Booster Box (64 Packs)",
            "buyPrice": 71.26,
            "sellPrice": 117.38,
            "requiredLevel": 71,
            "type": "box",
            "volume": 16,
            "contains": {
                "itemId": "pack_sv01",
                "amount": 64
            },
            "description": "Hộp Scarlet & Violet gồm 64 Booster Pack. Giá sỉ cực tốt.",
            "sourceSetId": "sv01",
            "generation": "GENERATION IX"
        },
        "pack_sv02": {
            "id": "pack_sv02",
            "name": "Paldea Evolved Booster Pack",
            "buyPrice": 1.48,
            "sellPrice": 2.37,
            "requiredLevel": 71,
            "type": "pack",
            "volume": 1,
            "description": "Pack của bộ Paldea Evolved. Thế hệ: GENERATION IX.",
            "sourceSetId": "sv02",
            "generation": "GENERATION IX"
        },
        "box_sv02": {
            "id": "box_sv02",
            "name": "Paldea Evolved Booster Box (64 Packs)",
            "buyPrice": 80.51,
            "sellPrice": 132.61,
            "requiredLevel": 71,
            "type": "box",
            "volume": 16,
            "contains": {
                "itemId": "pack_sv02",
                "amount": 64
            },
            "description": "Hộp Paldea Evolved gồm 64 Booster Pack. Giá sỉ cực tốt.",
            "sourceSetId": "sv02",
            "generation": "GENERATION IX"
        },
        "pack_sv03": {
            "id": "pack_sv03",
            "name": "Obsidian Flames Booster Pack",
            "buyPrice": 1.83,
            "sellPrice": 2.93,
            "requiredLevel": 71,
            "type": "pack",
            "volume": 1,
            "description": "Pack của bộ Obsidian Flames. Thế hệ: GENERATION IX.",
            "sourceSetId": "sv03",
            "generation": "GENERATION IX"
        },
        "box_sv03": {
            "id": "box_sv03",
            "name": "Obsidian Flames Booster Box (64 Packs)",
            "buyPrice": 99.55,
            "sellPrice": 163.97,
            "requiredLevel": 71,
            "type": "box",
            "volume": 16,
            "contains": {
                "itemId": "pack_sv03",
                "amount": 64
            },
            "description": "Hộp Obsidian Flames gồm 64 Booster Pack. Giá sỉ cực tốt.",
            "sourceSetId": "sv03",
            "generation": "GENERATION IX"
        },
        "pack_sv03_5": {
            "id": "pack_sv03_5",
            "name": "151 Booster Pack",
            "buyPrice": 1.57,
            "sellPrice": 2.51,
            "requiredLevel": 71,
            "type": "pack",
            "volume": 1,
            "description": "Pack của bộ 151. Thế hệ: GENERATION IX.",
            "sourceSetId": "sv03.5",
            "generation": "GENERATION IX"
        },
        "box_sv03_5": {
            "id": "box_sv03_5",
            "name": "151 Booster Box (64 Packs)",
            "buyPrice": 85.41,
            "sellPrice": 140.67,
            "requiredLevel": 71,
            "type": "box",
            "volume": 16,
            "contains": {
                "itemId": "pack_sv03_5",
                "amount": 64
            },
            "description": "Hộp 151 gồm 64 Booster Pack. Giá sỉ cực tốt.",
            "sourceSetId": "sv03.5",
            "generation": "GENERATION IX"
        },
        "pack_sv04": {
            "id": "pack_sv04",
            "name": "Paradox Rift Booster Pack",
            "buyPrice": 1.43,
            "sellPrice": 2.29,
            "requiredLevel": 71,
            "type": "pack",
            "volume": 1,
            "description": "Pack của bộ Paradox Rift. Thế hệ: GENERATION IX.",
            "sourceSetId": "sv04",
            "generation": "GENERATION IX"
        },
        "box_sv04": {
            "id": "box_sv04",
            "name": "Paradox Rift Booster Box (64 Packs)",
            "buyPrice": 77.79,
            "sellPrice": 128.13,
            "requiredLevel": 71,
            "type": "box",
            "volume": 16,
            "contains": {
                "itemId": "pack_sv04",
                "amount": 64
            },
            "description": "Hộp Paradox Rift gồm 64 Booster Pack. Giá sỉ cực tốt.",
            "sourceSetId": "sv04",
            "generation": "GENERATION IX"
        },
        "pack_sv04_5": {
            "id": "pack_sv04_5",
            "name": "Paldean Fates Booster Pack",
            "buyPrice": 1.74,
            "sellPrice": 2.78,
            "requiredLevel": 71,
            "type": "pack",
            "volume": 1,
            "description": "Pack của bộ Paldean Fates. Thế hệ: GENERATION IX.",
            "sourceSetId": "sv04.5",
            "generation": "GENERATION IX"
        },
        "box_sv04_5": {
            "id": "box_sv04_5",
            "name": "Paldean Fates Booster Box (64 Packs)",
            "buyPrice": 94.66,
            "sellPrice": 155.9,
            "requiredLevel": 71,
            "type": "box",
            "volume": 16,
            "contains": {
                "itemId": "pack_sv04_5",
                "amount": 64
            },
            "description": "Hộp Paldean Fates gồm 64 Booster Pack. Giá sỉ cực tốt.",
            "sourceSetId": "sv04.5",
            "generation": "GENERATION IX"
        },
        "pack_sv05": {
            "id": "pack_sv05",
            "name": "Temporal Forces Booster Pack",
            "buyPrice": 1.52,
            "sellPrice": 2.43,
            "requiredLevel": 71,
            "type": "pack",
            "volume": 1,
            "description": "Pack của bộ Temporal Forces. Thế hệ: GENERATION IX.",
            "sourceSetId": "sv05",
            "generation": "GENERATION IX"
        },
        "box_sv05": {
            "id": "box_sv05",
            "name": "Temporal Forces Booster Box (64 Packs)",
            "buyPrice": 82.69,
            "sellPrice": 136.19,
            "requiredLevel": 71,
            "type": "box",
            "volume": 16,
            "contains": {
                "itemId": "pack_sv05",
                "amount": 64
            },
            "description": "Hộp Temporal Forces gồm 64 Booster Pack. Giá sỉ cực tốt.",
            "sourceSetId": "sv05",
            "generation": "GENERATION IX"
        },
        "pack_sv06": {
            "id": "pack_sv06",
            "name": "Twilight Masquerade Booster Pack",
            "buyPrice": 1.66,
            "sellPrice": 2.66,
            "requiredLevel": 71,
            "type": "pack",
            "volume": 1,
            "description": "Pack của bộ Twilight Masquerade. Thế hệ: GENERATION IX.",
            "sourceSetId": "sv06",
            "generation": "GENERATION IX"
        },
        "box_sv06": {
            "id": "box_sv06",
            "name": "Twilight Masquerade Booster Box (64 Packs)",
            "buyPrice": 90.3,
            "sellPrice": 148.74,
            "requiredLevel": 71,
            "type": "box",
            "volume": 16,
            "contains": {
                "itemId": "pack_sv06",
                "amount": 64
            },
            "description": "Hộp Twilight Masquerade gồm 64 Booster Pack. Giá sỉ cực tốt.",
            "sourceSetId": "sv06",
            "generation": "GENERATION IX"
        },
        "pack_sv06_5": {
            "id": "pack_sv06_5",
            "name": "Shrouded Fable Booster Pack",
            "buyPrice": 1.28,
            "sellPrice": 2.05,
            "requiredLevel": 71,
            "type": "pack",
            "volume": 1,
            "description": "Pack của bộ Shrouded Fable. Thế hệ: GENERATION IX.",
            "sourceSetId": "sv06.5",
            "generation": "GENERATION IX"
        },
        "box_sv06_5": {
            "id": "box_sv06_5",
            "name": "Shrouded Fable Booster Box (64 Packs)",
            "buyPrice": 69.63,
            "sellPrice": 114.69,
            "requiredLevel": 71,
            "type": "box",
            "volume": 16,
            "contains": {
                "itemId": "pack_sv06_5",
                "amount": 64
            },
            "description": "Hộp Shrouded Fable gồm 64 Booster Pack. Giá sỉ cực tốt.",
            "sourceSetId": "sv06.5",
            "generation": "GENERATION IX"
        },
        "pack_sv07": {
            "id": "pack_sv07",
            "name": "Stellar Crown Booster Pack",
            "buyPrice": 1.5,
            "sellPrice": 2.4,
            "requiredLevel": 71,
            "type": "pack",
            "volume": 1,
            "description": "Pack của bộ Stellar Crown. Thế hệ: GENERATION IX.",
            "sourceSetId": "sv07",
            "generation": "GENERATION IX"
        },
        "box_sv07": {
            "id": "box_sv07",
            "name": "Stellar Crown Booster Box (64 Packs)",
            "buyPrice": 81.6,
            "sellPrice": 134.4,
            "requiredLevel": 71,
            "type": "box",
            "volume": 16,
            "contains": {
                "itemId": "pack_sv07",
                "amount": 64
            },
            "description": "Hộp Stellar Crown gồm 64 Booster Pack. Giá sỉ cực tốt.",
            "sourceSetId": "sv07",
            "generation": "GENERATION IX"
        },
        "pack_sv08": {
            "id": "pack_sv08",
            "name": "Surging Sparks Booster Pack",
            "buyPrice": 1.3,
            "sellPrice": 2.08,
            "requiredLevel": 71,
            "type": "pack",
            "volume": 1,
            "description": "Pack của bộ Surging Sparks. Thế hệ: GENERATION IX.",
            "sourceSetId": "sv08",
            "generation": "GENERATION IX"
        },
        "box_sv08": {
            "id": "box_sv08",
            "name": "Surging Sparks Booster Box (64 Packs)",
            "buyPrice": 70.72,
            "sellPrice": 116.48,
            "requiredLevel": 71,
            "type": "box",
            "volume": 16,
            "contains": {
                "itemId": "pack_sv08",
                "amount": 64
            },
            "description": "Hộp Surging Sparks gồm 64 Booster Pack. Giá sỉ cực tốt.",
            "sourceSetId": "sv08",
            "generation": "GENERATION IX"
        },
        "pack_sv08_5": {
            "id": "pack_sv08_5",
            "name": "Prismatic Evolutions Booster Pack",
            "buyPrice": 1.55,
            "sellPrice": 2.48,
            "requiredLevel": 71,
            "type": "pack",
            "volume": 1,
            "description": "Pack của bộ Prismatic Evolutions. Thế hệ: GENERATION IX.",
            "sourceSetId": "sv08.5",
            "generation": "GENERATION IX"
        },
        "box_sv08_5": {
            "id": "box_sv08_5",
            "name": "Prismatic Evolutions Booster Box (64 Packs)",
            "buyPrice": 84.32,
            "sellPrice": 138.88,
            "requiredLevel": 71,
            "type": "box",
            "volume": 16,
            "contains": {
                "itemId": "pack_sv08_5",
                "amount": 64
            },
            "description": "Hộp Prismatic Evolutions gồm 64 Booster Pack. Giá sỉ cực tốt.",
            "sourceSetId": "sv08.5",
            "generation": "GENERATION IX"
        },
        "pack_sv09": {
            "id": "pack_sv09",
            "name": "Journey Together Booster Pack",
            "buyPrice": 1.71,
            "sellPrice": 2.74,
            "requiredLevel": 71,
            "type": "pack",
            "volume": 1,
            "description": "Pack của bộ Journey Together. Thế hệ: GENERATION IX.",
            "sourceSetId": "sv09",
            "generation": "GENERATION IX"
        },
        "box_sv09": {
            "id": "box_sv09",
            "name": "Journey Together Booster Box (64 Packs)",
            "buyPrice": 93.02,
            "sellPrice": 153.22,
            "requiredLevel": 71,
            "type": "box",
            "volume": 16,
            "contains": {
                "itemId": "pack_sv09",
                "amount": 64
            },
            "description": "Hộp Journey Together gồm 64 Booster Pack. Giá sỉ cực tốt.",
            "sourceSetId": "sv09",
            "generation": "GENERATION IX"
        },
        "pack_sv10": {
            "id": "pack_sv10",
            "name": "Destined Rivals Booster Pack",
            "buyPrice": 1.69,
            "sellPrice": 2.7,
            "requiredLevel": 71,
            "type": "pack",
            "volume": 1,
            "description": "Pack của bộ Destined Rivals. Thế hệ: GENERATION IX.",
            "sourceSetId": "sv10",
            "generation": "GENERATION IX"
        },
        "box_sv10": {
            "id": "box_sv10",
            "name": "Destined Rivals Booster Box (64 Packs)",
            "buyPrice": 91.94,
            "sellPrice": 151.42,
            "requiredLevel": 71,
            "type": "box",
            "volume": 16,
            "contains": {
                "itemId": "pack_sv10",
                "amount": 64
            },
            "description": "Hộp Destined Rivals gồm 64 Booster Pack. Giá sỉ cực tốt.",
            "sourceSetId": "sv10",
            "generation": "GENERATION IX"
        },
        "pack_sv10_5w": {
            "id": "pack_sv10_5w",
            "name": "White Flare Booster Pack",
            "buyPrice": 1.71,
            "sellPrice": 2.74,
            "requiredLevel": 71,
            "type": "pack",
            "volume": 1,
            "description": "Pack của bộ White Flare. Thế hệ: GENERATION IX.",
            "sourceSetId": "sv10.5w",
            "generation": "GENERATION IX"
        },
        "box_sv10_5w": {
            "id": "box_sv10_5w",
            "name": "White Flare Booster Box (64 Packs)",
            "buyPrice": 93.02,
            "sellPrice": 153.22,
            "requiredLevel": 71,
            "type": "box",
            "volume": 16,
            "contains": {
                "itemId": "pack_sv10_5w",
                "amount": 64
            },
            "description": "Hộp White Flare gồm 64 Booster Pack. Giá sỉ cực tốt.",
            "sourceSetId": "sv10.5w",
            "generation": "GENERATION IX"
        },
        "pack_sv10_5b": {
            "id": "pack_sv10_5b",
            "name": "Black Bolt Booster Pack",
            "buyPrice": 1.78,
            "sellPrice": 2.85,
            "requiredLevel": 71,
            "type": "pack",
            "volume": 1,
            "description": "Pack của bộ Black Bolt. Thế hệ: GENERATION IX.",
            "sourceSetId": "sv10.5b",
            "generation": "GENERATION IX"
        },
        "box_sv10_5b": {
            "id": "box_sv10_5b",
            "name": "Black Bolt Booster Box (64 Packs)",
            "buyPrice": 96.83,
            "sellPrice": 159.49,
            "requiredLevel": 71,
            "type": "box",
            "volume": 16,
            "contains": {
                "itemId": "pack_sv10_5b",
                "amount": 64
            },
            "description": "Hộp Black Bolt gồm 64 Booster Pack. Giá sỉ cực tốt.",
            "sourceSetId": "sv10.5b",
            "generation": "GENERATION IX"
        }
    },
    "setCardsCache": {}
}