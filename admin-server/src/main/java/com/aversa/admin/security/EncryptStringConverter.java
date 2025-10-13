package com.aversa.admin.security;

import jakarta.persistence.AttributeConverter;
import jakarta.persistence.Converter;

@Converter(autoApply = false)
public class EncryptStringConverter implements AttributeConverter<String, String> {
    @Override
    public String convertToDatabaseColumn(String attribute) {
        return attribute == null || attribute.isBlank() ? attribute : DataEncryptor.encrypt(attribute);
    }

    @Override
    public String convertToEntityAttribute(String dbData) {
        return dbData == null || dbData.isBlank() ? dbData : DataEncryptor.decrypt(dbData);
    }
}