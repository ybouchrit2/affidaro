# مخطط واجهة الإدارة وعلاقات البيانات

يوضح هذا المستند العلاقات بين الجداول (ERD)، مخطط التصفح (Sitemap)، ومواصفات الصفحات والتنسيق لواجهة الإدارة (Admin UI) بشكل احترافي ومنظم.

## مخطط العلاقات (ERD)

```mermaid
erDiagram
    CUSTOMERS ||--o{ CONTRACTS : has
    CUSTOMERS ||--o{ VISITS : has
    USERS ||--o{ LOGS : performs
    CONTRACTS }o--o{ LOGS : referenced
    VISITS }o--o{ LOGS : referenced

    CUSTOMERS {
        int id PK
        string name
        string email
        string phone
        enum status
        datetime created_at
        datetime updated_at
    }
    CONTRACTS {
        int id PK
        int customer_id FK
        string service
        decimal price
        string currency
        date start_date
        date end_date
        enum status
    }
    VISITS {
        int id PK
        int customer_id FK
        string page
        string referrer
        int duration_seconds
        datetime visited_at
    }
    USERS {
        int id PK
        string username
        string email
        enum role
        datetime created_at
        datetime updated_at
    }
    LOGS {
        int id PK
        int user_id FK
        string action
        string target_type
        int target_id
        datetime timestamp
    }
```

## مخطط التصفح (Sitemap)

```mermaid
flowchart LR
    Sidebar[[Sidebar]] --> Dashboard
    Sidebar --> Customers
    Sidebar --> Contracts
    Sidebar --> Visits
    Sidebar --> Logs

    Customers --> CustomerDetailsModal[(Modal: تفاصيل العميل)]
    Customers --> CustomerContractsView[عقود العميل]
    Customers --> CustomerVisitsView[زيارات العميل]

    Contracts --> ContractEditModal[(Modal: تعديل/إغلاق/طباعة)]
    Visits --> VisitStatsCard[إحصاءات مصغرة]
    Logs --> LogFilterPanel[فلترة/بحث]
```

## مواصفات الصفحات

### لوحة القيادة (Dashboard)
- إحصاءات سريعة: إجمالي العملاء، العملاء الجدد اليوم، إجمالي العقود، الزيارات الأخيرة.
- رسوم بيانية: زيارات حسب الصفحة، عقود جديدة شهريًا، توزيع العملاء حسب الحالة.
- بطاقات (Cards) بمؤشرات الأداء مع رموز وحالة.

### العملاء (Customers)
- جدول أعمدة: الاسم، البريد، الهاتف، الحالة، تاريخ الإنشاء، عدد العقود، آخر زيارة.
- فلترة/بحث: الاسم، البريد، الحالة، تاريخ الإنشاء.
- إجراءات سريعة لكل صف: عرض العقود، عرض الزيارات، تعديل، حذف.
- Modal تفاصيل: معلومات العميل + تبويب للعقود والزيارات المرتبطة.
- Pagination وفرز بالأعمدة.

### العقود (Contracts)
- جدول أعمدة: رقم العقد، العميل، الخدمة، السعر، العملة، الحالة، البدء/الانتهاء.
- فلترة: حسب العميل، الحالة، نوع الخدمة، نطاق التواريخ.
- إجراءات: تعديل العقد، إغلاق العقد، طباعة.
- دعم تصدير CSV/PDF.

### الزيارات (Visits)
- جدول أعمدة: العميل، الصفحة، المحيل، مدة الزيارة، التاريخ/الوقت.
- فلترة: حسب العميل، الصفحة، التاريخ.
- إحصاءات مصغرة: إجمالي مدة الزيارات لكل عميل.

### السجلات (Logs)
- جدول أعمدة: المستخدم، الإجراء، العنصر المستهدف، الوقت.
- فلترة: حسب المستخدم، نوع العنصر، التاريخ.
- بحث سريع على كامل الحقول.

## المكونات المشتركة (Components)
- Sidebar: تنقل بين Dashboard, Customers, Contracts, Visits, Logs؛ قابل للإخفاء على الهواتف.
- Header: بحث عام، إشعارات، اسم المستخدم.
- Tables: فرز وفلترة، حجم صفحة قابل للتغيير، مؤشرات تحميل، حالة فارغة.
- Filters: شريط علوي أو جانبي، عناصر اختيار متعددة، نطاقات تاريخ.
- Pagination: أزرار السابق/التالي، قفز لصفحة، حجم الصفحة.
- Modals: إضافة/تعديل العملاء أو العقود، تأكيدات الحذف.
- Charts: خطوط/أعمدة/دونات للإحصاءات الرئيسية.

## التنسيق والألوان
- ألوان هادئة بتباين جيد؛ خطوط: Roboto أو Inter.
- رموز الحالة:
  - Active → أخضر
  - Pending → أصفر
  - Inactive/Closed → أحمر

## Responsive Design
- الجداول تتكيف مع الشاشات الصغيرة (طي الأعمدة أو تمرير أفقي).
- Sidebar يختفي أو يندمج في زر Hamburger.
- بطاقات إحصاءات بصفوف متعددة على الهواتف.

## وظائف إضافية
- Export/Print: CSV أو PDF للعملاء، العقود، الزيارات.
- اختصارات سريعة من الجدول: تعديل، حذف، طباعة، إضافة جديد.
- روابط مرتبطة:
  - العميل → قائمة العقود + الزيارات.
  - العقد → تفاصيل العميل وتاريخه.

## خريطة بيانات إلى الواجهة (مرجع تقني مختصر)
- العملاء: list، detail، create/update/delete.
- العقود: list، by-customer، edit/close/print.
- الزيارات: list، by-customer، إحصاءات.
- السجلات: list، filter/search.

> هذا المخطط يُعد مرجع التنفيذ للـ Admin UI، ويمكن تحويله مباشرة إلى صفحات ومكونات مع الحفاظ على القابلية للتوسعة.