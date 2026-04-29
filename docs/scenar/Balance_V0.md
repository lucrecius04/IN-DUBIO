# Balance V0 — hratelný základ před batch testy

Cíl V0: hra má být napínavá a důsledková, ale ne trestající. Hráč má cítit, že jeho rozhodnutí mění svět i Bena, zároveň má skoro vždy existovat aspoň jedna smysluplná cesta dál.

---

## 1) Designové principy (V0)

- Důsledky mají být čitelné ve 3 vrstvách: **hned** (verdikt), **večer/ráno** (echo), **v týdnu** (směr kampaně).
- Hráč má dostávat kombinaci: `jistota` (co se stalo) + `nejistota` (co to spustí později).
- Žádná jednotlivá volba nemá hru „zabít“. Krize má být hratelná, ne slepá ulička.
- Finance, Integrita, Odvaha jsou hlavní osy tlaku; Moudrost, Vina, Naděje jsou hlavní osy tónu.
- Frakce mění kontext a nabídku voleb, nemají přebít osobní rozhodování hráče.

---

## 2) V0 guardrails (číselné koridory)

Koridory pro **střední** průchod (ne perfektní, ne katastrofický):

| Checkpoint | Finance (balance) | Integrita | Odvaha | Moudrost | Vina | Naděje |
|---|---:|---:|---:|---:|---:|---:|
| Po 1. týdnu (kal. den 7) | -20 až 40 | 60-75 | 45-60 | 55-70 | 55-70 | 50-65 |
| Po D11 eventu | 60 až 180 | 40-70 | 45-70 | 60-80 | 55-80 | 45-70 |
| Před finále (kal. den 16) | 40 až 160 | 35-75 | 40-75 | 60-85 | 50-85 | 35-70 |

Hard guardrails (V0):

- Finance nesmí být ve středním průchodu pod 0 déle než 2 pracovní dny v kuse.
- Integrita < 10 a Odvaha < 10 mají být spíš důsledek série rozhodnutí, ne jednoho dne.
- Naděje má v běžném průchodu oscilovat, ne lineárně padat.

---

## 3) Modelování V0 pro ekonomiku

Pro předběžné modely (bez AI batche) používat:

- `Balancing.csv` jako primární tabulku denní bilance.
- `Manual zasah (vikend/design)` jen na explicitní designové zásahy.
- U výrazných jednorázových eventů držet dvě větve:
  - **A:** bez přijetí kompromisu,
  - **B:** s přijetím kompromisu.

Prakticky:

- model A/B porovnávat na třech checkpointech výše,
- pokud je rozdíl mezi A/B větší než ~140 Kčs už po jednom rozhodnutí, doplnit narativní varování dřív (ne až při krizi).

---

## 4) V0 zpětná vazba hráči (co má cítit)

### Okamžitá (po rozsudku)
- Krátké slovní vyhodnocení směru: „Soudně čisté“, „Pragmatický kompromis“, „Tvrdý zásah“.
- Jedna věta o sociálním dopadu (Lid/Moc/Kapital), ne jen čísla.

### Krátkodobá (večer/ráno)
- Večerní volba má ukazovat cenu: čas / nervy / peníze.
- Ranní fragment potvrzuje, že včerejší volba „nezmizela“.

### Střednědobá (týden)
- Sobota/Neděle má fungovat jako psychologický reset:
  - odměna za konzistenci,
  - ale i připomínka nevyřešených dluhů.

---

## 5) Anti-frustrace (V0)

- Když je hráč v ekonomickém tlaku, hra má nabídnout minimálně jednu „důstojnou“ volbu (ne jen cynický kompromis).
- Při nízké Odvaze nezamykat všechno; nechat aspoň slabší bezpečnou investigaci.
- Při nízké Integritě ponechat šanci návratu (pomalejší, ale reálnou).
- Pokud hráč opakovaně volí „bezpečně“, hra má to reflektovat tónem, ne jen trestem.

---

## 6) Co měřit před AI betatesty

Minimální V0 metriky (ručně / poloautomat):

- `finance_konec_stred`
- `pocet_prac_dni_s_inkoust<=1_po_prvnim_spisu`
- `pocet_dni_v_krizi_finance`
- `pocet_dni_v_krizi_integrita_odvaha`
- `trend_nadeje` (klesá / osciluje / roste)

Pokud 2+ metriky jdou mimo guardrails, nejdřív ladit finance + inkoust, až potom jemné prahy traitů.

