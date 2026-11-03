// app/(tabs)/_layout.tsx
import { Tabs } from 'expo-router';
import Ionicons from '@react-native-vector-icons/ionicons';

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: '#0077B6',
        tabBarInactiveTintColor: '#64748B',
        tabBarStyle: {
          borderTopColor: '#E2E8F0',
          backgroundColor: '#FFFFFF',
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Lugares',
          headerTitle: 'Mi Ciudad Colón',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="compass-outline" size={size || 24} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="mapa"
        options={{
          title: 'Mapa',
          headerTitle: 'Mapa Interactivo',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="map-outline" size={size || 24} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="agenda"
        options={{
          title: 'Agenda',
          headerTitle: 'Agenda de Eventos',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="calendar-outline" size={size || 24} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="recorrido"
        options={{
          title: 'Mi Recorrido',
          headerTitle: 'Mi Recorrido',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="camera-outline" size={size || 24} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="perfil"
        options={{
          title: 'Yo',
          headerTitle: 'Mi Perfil',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="person-outline" size={size || 24} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}
