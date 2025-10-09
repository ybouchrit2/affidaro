# Aversa Website

موقع ثابت HTML/CSS/JS مع لوحة إدارة Spring Boot (admin-server) لعرض الزيارات والرسائل.

## البنية
- `index.html` و`sections/` صفحات الموقع.
- `assets/` الموارد (صور، CSS، JS).
- `admin-server/` مشروع Spring Boot لخدمات الإدارة وواجهات `/admin`.

## التشغيل المحلي
- واجهة الموقع: تشغيل خادم PHP مدمج:
  - `php -S localhost:8001 -t C:\xampp\htdocs\aversa_website`
  - فتح `http://localhost:8001/`
- لوحة الإدارة: تشغيل الـ JAR بملف تعريف H2:
  - إعداد `JAVA_HOME` (يوجد JDK ضمن `admin-server/tools/jdk17/`).
  - `java -jar admin-server/target/admin-server-0.0.1-SNAPSHOT.jar --spring.profiles.active=h2`
  - فتح `http://localhost:8090/admin/index.html`

## ملاحظات الإصدار
- تم تحديث لوحة الإدارة لعرض جميع حقول نموذج التواصل.
- تم إصلاح نمط رقم الهاتف في النموذج.
- تم تحديث روابط favicon لمنع أخطاء 404 أثناء التطوير.

## النشر
- يُنصح باستخدام Cloudflare Pages للواجهة وOracle/Hetzner للخلفية.
- إعداد `API_BASE` و`CORS` و`SMTP` و`HTTPS` قبل الإنتاج.

## تجاهل الملفات
- راجع `.gitignore` لتجنب تضمين مخرجات البناء والأدوات المحلية.