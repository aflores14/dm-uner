import React from 'react';
import { Tabs } from 'expo-router';
import { useColorScheme } from 'react-native';
import Ionicons from '@react-native-vector-icons/ionicons';

export default function TabLayout() {
  const colorScheme = useColorScheme();

  return (
    <Tabs screenOptions={{
      tabBarActiveTintColor: '#0077B6',
      headerStyle: { backgroundColor: colorScheme === 'dark' ? '#03045E' : '#FFFFFF' },
      headerTitleStyle: { fontWeight: 'bold' },
    }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Guía',
          tabBarIcon: ({ color }) => <Ionicons name="map-outline" size={24} color={color} />,
        }}
      />
      <Tabs.Screen
        name="perfil"
        options={{
          title: 'Perfil',
          tabBarIcon: ({ color }) => <Ionicons name="person-outline" size={24} color={color} />,
        }}
      />
    </Tabs>
  );
}