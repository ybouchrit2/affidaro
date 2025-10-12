# Aversa Website

موقع ثابت HTML/CSS/JS مع لوحة إدارة Spring Boot (admin-server) لعرض الزيارات والرسائل.

## البنية
- `index.html` و`sections/` صفحات الموقع.
- `assets/` الموارد (صور، CSS، JS).
- `admin-server/` مشروع Spring Boot لخدمات الإدارة وواجهات `/admin`.

## التشغيل والإنتاج
- الموقع: افتح `https://affidaro.com/`
- لوحة الإدارة: افتح `https://affidaro.com/admin/index.html`

## ملاحظات الإصدار
- تم تحديث لوحة الإدارة لعرض جميع حقول نموذج التواصل.
- تم إصلاح نمط رقم الهاتف في النموذج.
- تم تحديث روابط favicon لمنع أخطاء 404 أثناء التطوير.

## النشر
- يُنصح باستخدام Cloudflare Pages للواجهة وOracle/Hetzner للخلفية.
- إعداد `API_BASE` و`CORS` و`SMTP` و`HTTPS` قبل الإنتاج.

## تجاهل الملفات
- راجع `.gitignore` لتجنب تضمين مخرجات البناء والأدوات المحلية.