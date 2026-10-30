// app/(tabs)/perfil.tsx
import { zodResolver } from '@hookform/resolvers/zod';
import axios from 'axios';
import * as SecureStore from 'expo-secure-store';
import { StatusBar } from 'expo-status-bar';
import React, { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as z from 'zod';

import { BotonApp } from '../../src/componentes/BotonApp';
import { clienteHttp } from '../../src/servicios/cliente';

// 1. Esquema ajustado a la documentación real de la API
const loginSchema = z.object({
  email: z.string().email('Email no válido'),
  contrasena: z.string().min(5, 'Mínimo 5 caracteres'),
});

type LoginForm = z.infer<typeof loginSchema>;

export default function PerfilScreen() {
  const [loading, setLoading] = useState(false);
  const insets = useSafeAreaInsets();
  
  const { 
    control, 
    handleSubmit, 
    formState: { errors } 
  } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
    mode: 'onSubmit' // REQUERIMIENTO CÁTEDRA
  });

  const onSubmit = async (data: LoginForm) => {
    try {
      setLoading(true);
      // Ajustado a la documentación: envía email y contrasena
      const res = await clienteHttp.post('/auth/ingreso', { 
        email: data.email, 
        contrasena: data.contrasena 
      });
      
      // Guardar el token devuelto por el objeto "datos"
      await SecureStore.setItemAsync('jwt_auth_token_v1', res.data.datos.token);
      Alert.alert("Éxito", "Sesión iniciada correctamente");
    } catch (e) {
      if (axios.isAxiosError(e)) {
        // Captura el mensaje de error específico (Ej: CREDENCIALES_INVALIDAS)
        const mensaje = e.response?.data?.error?.mensaje || "Error al conectar con el servidor";
        Alert.alert("Error de acceso", mensaje);
      } else {
        Alert.alert("Error", "Ocurrió un error inesperado");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <StatusBar style="dark" />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <Text style={styles.title}>Ingreso Turista</Text>
          
          <View style={styles.formGroup}>
            <Text style={styles.label}>Email</Text>
            <Controller
              control={control}
              name="email"
              render={({ field: { onChange, value, onBlur } }) => (
                <TextInput
                  style={[styles.input, errors.email && styles.inputError]}
                  onBlur={onBlur}
                  onChangeText={onChange}
                  value={value}
                  placeholder="ejemplo@mail.com"
                  keyboardType="email-address"
                  autoCapitalize="none"
                />
              )}
            />
            {errors.email && <Text style={styles.error}>{errors.email.message}</Text>}
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.label}>Contraseña</Text>
            <Controller
              control={control}
              name="contrasena"
              render={({ field: { onChange, value, onBlur } }) => (
                <TextInput
                  style={[styles.input, errors.contrasena && styles.inputError]}
                  onBlur={onBlur}
                  onChangeText={onChange}
                  value={value}
                  placeholder="********"
                  secureTextEntry
                />
              )}
            />
            {errors.contrasena && <Text style={styles.error}>{errors.contrasena.message}</Text>}
          </View>

          <BotonApp 
            titulo="Ingresar" 
            onPress={handleSubmit(onSubmit)} 
            isLoading={loading} 
            style={styles.boton}
          />
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8F9FA' },
  scrollContent: { padding: 20, justifyContent: 'center', flexGrow: 1 },
  title: { fontSize: 28, fontWeight: 'bold', color: '#03045E', marginBottom: 30, textAlign: 'center' },
  formGroup: { marginBottom: 20 },
  label: { fontSize: 14, color: '#03045E', fontWeight: '600', marginBottom: 8 },
  input: { 
    backgroundColor: '#FFFFFF', 
    borderWidth: 1, 
    borderColor: '#0077B6', 
    borderRadius: 10, 
    padding: 15, 
    fontSize: 16,
    color: '#000000' 
  },
  inputError: { borderColor: '#D00000' },
  error: { color: '#D00000', fontSize: 12, marginTop: 5 },
  boton: { marginTop: 10 }
});