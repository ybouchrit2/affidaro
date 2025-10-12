# 🛡️ تعليمات Tre: الحماية الكاملة لموقع Affidaro Admin (احترافي 100%)

## 🎯 الهدف

ضمان أن موقع Affidaro Admin آمن تمامًا ضد جميع أنواع الثغرات، مع تطبيق معايير الأمان المؤسسي (Enterprise Security Standards) دون التأثير على الأداء أو سهولة الاستخدام.

---

## 1) حماية البنية الأساسية (Infrastructure Security)

- استخدم HTTPS فقط
  - فرض التحويل التلقائي من HTTP إلى HTTPS على مستوى الـ CDN أو الـ Web Server.
  - تركيب شهادة SSL موثوقة، وتفعيل HSTS على النطاق: `Strict-Transport-Security: max-age=31536000; includeSubDomains; preload`.
  - تأكد أن كل الاتصالات Frontend ↔ API تعمل عبر HTTPS حصريًا.

- الجدران النارية (Firewall / WAF)
  - فعل جدار ناري (UFW/iptables) أو Cloudflare WAF حسب طبقة النشر.
  - امنع المنافذ غير الضرورية (اسمح فقط لـ 80/443، و22 للـ SSH بمصدر موثوق أو عبر VPN).
  - ضع قواعد DDoS Mitigation (Rate Limit على الشبكة، Bot Management، CAPTCHA عند الشك).

- عزل الخدمات (Container Security)
  - شغّل كل مكون (API، قاعدة البيانات، واجهة الإدارة) في Docker Container منفصل.
  - استخدم `non-root` داخل الـ containers، وقلص الصلاحيات (`readOnlyRootFilesystem` حيث ممكن).
  - افصل الشبكات والـ volumes، ولا تشارك الموارد إلا عند الضرورة القصوى.

- إدارة الوصول (Access Control)
  - إدارة الخوادم بمفاتيح SSH فقط (تعطيل PasswordAuth)، وتقييد الوصول عبر قائمة مصادر (AllowList).
  - خزّن كلمات المرور والمفاتيح في ملفات `.env` أو Secret Manager (لا تضعها في Git).
  - استخدم `fail2ban` لحظر محاولات تسجيل الدخول المشبوهة.

---

## 2) حماية واجهة برمجة التطبيقات (API Security)

- المصادقة (Authentication)
  - استخدم JWT أو OAuth2 حسب الحاجة. مدة صلاحية قصيرة (مثلاً 30 دقيقة).
  - اعتمد Refresh Token للتجديد الآمن، مع تدوير (Rotation) وإبطال (Revocation) عند اللزوم.
  - وقّع الـ JWT بمفتاح قوي (RSA/HS256) وخزّنه كسرّ.

- التحقق من الصلاحيات (Authorization)
  - طبّق RBAC: أدوار مثل Admin/Manager/Viewer. لا تعتمد على الواجهة فقط.
  - على كل Endpoint، تحقق من الدور والصلاحية في الـ backend.
  - استخدم تحققًا على مستوى المنهج: `@PreAuthorize("hasRole('ADMIN')")` أو سياسات مخصصة حسب الكيان.

- منع الاستغلال (Validation, Rate Limit, CORS)
  - تحقق من نوع البيانات وحدودها باستخدام Bean Validation على DTOs (مثل `@NotBlank`, `@Email`, `@Size`).
  - حدّد معدل الطلبات لكل مستخدم/IP (مثلاً 60 طلب/دقيقة). طبّق Bucket4j أو Filter مخصص.
  - سجّل جميع المحاولات الفاشلة في سجل أمن مركزي (Security Logs) مع سياق الطلب.
  - CORS: اسمح فقط بالنطاقات الرسمية، وحدد Methods/Headers بصرامة.

- إخفاء الأخطاء الحساسة
  - لا تُرجع Stack Trace أو تفاصيل داخلية إلى العميل.
  - استخدم `@ControllerAdvice` لمعالجة الأخطاء وإرجاع رسائل عامة.

- حماية المعرفات والروابط
  - تحقق ملكية المورد (Resource Ownership) قبل أي عملية قراءة/تعديل.
  - لا تعتمد على معرفات متزايدة فقط؛ راقب صلاحية الوصول للفرد.

---

## 3) حماية واجهة المستخدم (Frontend Security)

- منع XSS
  - لا تعرض أي مدخل من المستخدم بدون Escaping/Sanitization.
  - استخدم DOMPurify أو مكتبة sanitize قبل إدخال HTML إلى DOM.
  - فعّل Content Security Policy (CSP) صارمة:
    ```
    Content-Security-Policy: 
    default-src 'self';
    script-src 'self' https://cdn.jsdelivr.net;
    style-src 'self' https://cdn.jsdelivr.net 'unsafe-inline';
    img-src 'self' data:;
    font-src 'self' https://cdn.jsdelivr.net;
    connect-src 'self' https://your-api-domain.example;
    frame-ancestors 'none';
    ```

- منع CSRF
  - إن كنت تعتمد على Cookies: أضف CSRF Token في كل نموذج وتحقق منه على POST/PUT/DELETE.
  - استخدم `SameSite=Strict`, `HttpOnly`, `Secure` للكوكيز.

- منع الحقن (Injection)
  - نظّف نصوص البحث والحقول من الرموز الخطرة، واعتمد ORM (JPA) بدل SQL اليدوي.

- منع Clickjacking
  - أضف الهيدر: `X-Frame-Options: DENY` أو `frame-ancestors 'none'` ضمن CSP.

- رفع الملفات
  - تحقق `mime-type` والحجم، خزن خارج `/public`، أعد التسمية بـ UUID، ولا تقدّمها كـ HTML.

---

## 4) حماية قاعدة البيانات (Database Security)

- الاتصال الآمن
  - استخدم اتصال SSL بين التطبيق وقاعدة البيانات.
  - لا تسمح بالوصول العام لمنافذ قاعدة البيانات.

- الاستعلامات الآمنة
  - اعتمد ORM (JPA/Hibernate)، وعند الضرورة استخدم Prepared Statements.

- صلاحيات المستخدم
  - أنشئ مستخدمًا محدود الصلاحيات (ليس root): صلاحيات `SELECT/INSERT/UPDATE/DELETE` فقط.

- النسخ الاحتياطي والتشفير
  - نسخ احتياطية يومية، مشفّرة بـ AES-256، وتخزين في موقع منفصل.

---

## 5) حماية الجلسات والمستخدمين (Session & Auth Security)

- كلمات المرور
  - استخدم `bcrypt` أو `Argon2` مع Cost مناسب. لا تحفظ كـ نص عادي.

- الكوكيز
  - `HttpOnly`, `Secure`, `SameSite=Strict`. قلل عمر الكوكيز.

- نظام القفل (Account Lock)
  - بعد 5 محاولات فاشلة، قفل مؤقت وإشعار بالبريد.

- إشعار الجلسات ومحدودية التوازي
  - تنبيه عند تسجيل من جهاز جديد.
  - حد الجلسات المتزامنة لكل حساب.

---

## 6) حماية الخادم (Server Security)

- التحديثات الدورية
  - حدّث نظام التشغيل، صور Docker، ومكتبات Java/Python أسبوعيًا أو عند صدور تحديثات أمنية.

- صلاحيات الملفات
  - ملفات المشروع: `chmod 640`، مجلدات التشغيل: `chmod 750`. لا تجعل `.env` عامًا.

- سجلات المراقبة
  - فعّل سجلات الأمن (`/var/log/auth.log`, `/var/log/nginx/access.log`) وجمعها مركزيًا.

- مراقبة الزمن الحقيقي
  - Prometheus + Grafana + Alertmanager. تنبيهات عند حمل زائد أو سلوكيات غير طبيعية.

---

## 7) حماية الأداء والسرعة (مع الأمان)

- CDN (Cloudflare/Bunny)
  - وزّع المحتوى الثابت، فعّل Cache، واضبط قواعد الأمان على طبقة الـ CDN.

- ضغط الملفات
  - `gzip`/`brotli` على السيرفر و/أو الـ CDN.

- التخزين المؤقت (Caching)
  - افصل بين Cache للمحتوى العام والخاص، واحترم الـ Authorization.

- التحميل الكسول (Lazy Loading)
  - للصور والجداول الكبيرة، مع حدود آمنة لمقاييس العرض.

---

## 8) توصيات تطبيقية خاصة بـ Spring Boot (Affidaro Admin)

- SecurityConfig (مثال مبسّط)
  ```java
  @Configuration
  @EnableWebSecurity
  public class SecurityConfig {
      @Bean
      public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
          http
            .csrf(csrf -> csrf.disable()) // إن كانت المصادقة JWT بدون Cookies
            .cors(Customizer.withDefaults())
            .sessionManagement(sm -> sm.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
            .authorizeHttpRequests(auth -> auth
                .requestMatchers("/api/auth/**").permitAll()
                .requestMatchers(HttpMethod.GET, "/api/analytics/**").hasAnyRole("ADMIN","MANAGER")
                .requestMatchers("/api/contracts/**").hasAnyRole("ADMIN","MANAGER")
                .anyRequest().authenticated()
            );
          // أضف فلتر JWT للتحقق من التوكن قبل UsernamePasswordAuthenticationFilter
          return http.build();
      }

      @Bean
      public PasswordEncoder passwordEncoder() { return new BCryptPasswordEncoder(); }
  }
  ```

- CORS Configuration
  ```java
  @Bean
  public CorsConfigurationSource corsConfigurationSource() {
      CorsConfiguration config = new CorsConfiguration();
config.setAllowedOrigins(List.of("https://affidaro.com", "https://www.affidaro.com"));
      config.setAllowedMethods(List.of("GET","POST","PUT","DELETE","OPTIONS"));
      config.setAllowedHeaders(List.of("Content-Type","Authorization","X-Requested-With","Origin","Accept"));
      config.setAllowCredentials(true);
      UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
      source.registerCorsConfiguration("/**", config);
      return source;
  }
  ```

- Rate Limit Filter (Bucket4j مثال)
  ```java
  @Component
  public class RateLimitFilter extends OncePerRequestFilter {
      private final Map<String, Bandwidth> limits = Map.of(
          "default", Bandwidth.classic(60, Refill.intervally(60, Duration.ofMinutes(1)))
      );
      private final Map<String, Bucket> buckets = new ConcurrentHashMap<>();

      @Override
      protected void doFilterInternal(HttpServletRequest req, HttpServletResponse res, FilterChain chain)
              throws ServletException, IOException {
          String key = Optional.ofNullable(req.getRemoteAddr()).orElse("default");
          Bucket bucket = buckets.computeIfAbsent(key, k -> Bucket.builder().addLimit(limits.get("default")).build());
          if (bucket.tryConsume(1)) {
              chain.doFilter(req, res);
          } else {
              res.setStatus(HttpStatus.TOO_MANY_REQUESTS.value());
          }
      }
  }
  ```

- Global Exception Handler
  ```java
  @RestControllerAdvice
  public class GlobalExceptionHandler {
      @ExceptionHandler(Exception.class)
      public ResponseEntity<Map<String, Object>> handle(Exception ex) {
          // سجّل الخطأ داخليًا دون تسريب التفاصيل للعميل
          Map<String, Object> body = Map.of(
              "status", "error",
              "message", "حدث خطأ داخلي، الرجاء المحاولة لاحقًا."
          );
          return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(body);
      }
  }
  ```

- Validation على DTOs
  ```java
  public class CreateClientRequest {
      @NotBlank @Size(max=120) private String name;
      @Email @Size(max=180) private String email;
      @Size(max=32) private String phone;
      // بقية الحقول...
  }
  ```

- Security Headers عبر Spring (مثال)
  ```java
  @Bean
  public WebServerFactoryCustomizer<TomcatServletWebServerFactory> securityHeaders() {
      return factory -> factory.addContextCustomizers(context -> {
          context.addMimeMapping("html", "text/html; charset=UTF-8");
          // يمكن ضبط CSP/HSTS عبر Reverse Proxy (Nginx) أو Filter مخصص
      });
  }
  ```

- Actuator (مقيد الوصول)
  - فعّل `spring-boot-starter-actuator` مع قيود وصول صارمة، ولا تعرض المقاييس الحساسة علنًا.

---

## 9) تشغيلية وأتمتة الأمن (Operational Playbooks)

- الاستجابة للحوادث (Incident Response)
  - إجراءات واضحة: اكتشاف، احتواء، استئصال، تعافي، مراجعة.
  - تدوير المفاتيح والتوكنات عند أي اختراق محتمل.

- إدارة الثغرات
  - فحص دوري للمكتبات (OWASP Dependency-Check)، وتحليل ساكن (SAST) وديناميكي (DAST) وفق الجدول.

- النسخ الاحتياطي والاستعادة
  - اختبر الاستعادة دوريًا، وحدد نقاط الاستعادة (RPO/RTO) بوضوح.

---

## 10) متغيرات البيئة المقترحة (.env)

ضع القيم في Secret Manager أو `.env` غير متعقّب من Git:

```
APP_ENV=production
SERVER_PORT=8080

JWT_SECRET=<long_random_secret>
JWT_EXP_MINUTES=30
JWT_REFRESH_EXP_DAYS=14

DB_URL=jdbc:postgresql://db:5432/affidaro
DB_USER=affidaro_user
DB_PASSWORD=<secure_password>
DB_SSL=true

CORS_ALLOWED_ORIGINS=https://affidaro.com,https://www.affidaro.com
RATE_LIMIT_PER_MINUTE=60

MAIL_SMTP_HOST=smtp.example.com
MAIL_SMTP_USER=alerts@example.com
MAIL_SMTP_PASS=<secure_password>

LOG_LEVEL=INFO
```

---

## 11) سياسات إضافية مقترحة

- MFA للمشرفين.
- إشعارات عند تغيّر الصلاحيات أو إنشاء مستخدم جديد.
- مراجعة دورية لسجلات الدخول والخروج والتعديلات الحساسة.
- إزالة البيانات الحساسة من سجلات التطبيق (PII Redaction).

---

## 12) نقاط تكامل سريعة مع Affidaro Admin

- تأمين نقاط `/api/contracts`, `/api/clients`, `/api/analytics` بأدوار مناسبة.
- تفعيل التحقق قبل إنشاء عميل جديد عبر `/api/clients/lookup` لتفادي التكرار.
- تسجيل محاولات الوصول الفاشلة وعمليات الحذف/التحديث في `InteractionLog` مع دور ومستخدم منفذ.
- ضبط HikariCP بإعدادات آمنة لتجنب استنزاف الاتصالات.
- تفعيل التخزين المؤقت في التحليلات مع حدود معدل وصول لتفادي إساءة الاستخدام.

---

بهذا الدليل، يمتلك Tre (أو أي نظام تلقائي) خريطة تنفيذ شاملة تغطي طبقات الأمان كافة: البنية، الواجهة، الخادم، والـ API، مع أمثلة عملية لـ Spring Boot لضمان حماية احترافية بنسبة 100% دون التأثير على الأداء.