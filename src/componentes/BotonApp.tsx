import React from 'react';
import { Pressable, Text, StyleSheet, ActivityIndicator, ViewStyle, TextStyle } from 'react-native';

interface BotonAppProps {
  titulo: string;
  onPress: () => void;
  isLoading?: boolean;
  deshabilitado?: boolean;
  style?: ViewStyle;
}

export const BotonApp = ({ titulo, onPress, isLoading, deshabilitado, style }: BotonAppProps) => {
  return (
    <Pressable
      onPress={onPress}
      disabled={deshabilitado || isLoading}
      style={({ pressed }) => [
        styles.boton,
        style,
        pressed && styles.pressed,
        (deshabilitado || isLoading) && styles.disabled,
      ]}
    >
      {isLoading ? (
        <ActivityIndicator color="#FFFFFF" />
      ) : (
        <Text style={styles.texto}>{titulo}</Text>
      )}
    </Pressable>
  );
};

const styles = StyleSheet.create({
  boton: {
    backgroundColor: '#023E8A',
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 50,
  },
  texto: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  pressed: {
    opacity: 0.8,
    transform: [{ scale: 0.98 }],
  },
  disabled: {
    backgroundColor: '#A9D6E5',
  },
});