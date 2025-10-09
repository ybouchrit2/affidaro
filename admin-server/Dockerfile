# syntax=docker/dockerfile:1
FROM maven:3.9-eclipse-temurin-17 AS build
WORKDIR /workspace

# انسخ مشروع السيرفر فقط لتقليل حجم السياق
COPY admin-server/ admin-server/
WORKDIR /workspace/admin-server

# بناء الجار بدون اختبارات
RUN mvn -DskipTests clean package

# صورة التشغيل الخفيفة
FROM eclipse-temurin:17-jre
WORKDIR /app

# انسخ الجار النهائي
COPY --from=build /workspace/admin-server/target/admin-server-0.0.1-SNAPSHOT.jar app.jar

# ضبط خيارات JVM الاختيارية
ENV JAVA_OPTS="-Xms256m -Xmx512m"

# أمر التشغيل: يقرأ المنفذ من متغير PORT ويشغّل بروفايل prod
CMD ["sh","-c","java -Dserver.port=$PORT -jar app.jar --spring.profiles.active=prod"]