// repairmatch-mobile/App.tsx
import React, { useState } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, SafeAreaView, StatusBar } from 'react-native';
import LoginScreen from './src/screens/LoginScreen';
import RegisterScreen from './src/screens/RegisterScreen';
import RequestsListScreen from './src/screens/RequestsListScreen';

export default function App() {
  const [currentScreen, setCurrentScreen] = useState<'login' | 'register' | 'requests'>('login');

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />
      
      {/* Barra de navegación superior rápida para pruebas */}
      <View style={styles.navBar}>
        <TouchableOpacity 
          style={[styles.navButton, currentScreen === 'login' && styles.activeButton]} 
          onPress={() => setCurrentScreen('login')}
        >
          <Text style={[styles.navText, currentScreen === 'login' && styles.activeText]}>Login</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={[styles.navButton, currentScreen === 'register' && styles.activeButton]} 
          onPress={() => setCurrentScreen('register')}
        >
          <Text style={[styles.navText, currentScreen === 'register' && styles.activeText]}>Registro</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={[styles.navButton, currentScreen === 'requests' && styles.activeButton]} 
          onPress={() => setCurrentScreen('requests')}
        >
          <Text style={[styles.navText, currentScreen === 'requests' && styles.activeText]}>Solicitudes</Text>
        </TouchableOpacity>
      </View>

      {/* Renderizado condicional de la pantalla actual */}
      <View style={styles.content}>
        {currentScreen === 'login' && <LoginScreen />}
        {currentScreen === 'register' && <RegisterScreen />}
        {currentScreen === 'requests' && <RequestsListScreen />}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  navBar: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 10,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#ddd',
  },
  navButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 6,
  },
  activeButton: {
    backgroundColor: '#1B4D3E',
  },
  navText: {
    fontSize: 14,
    color: '#333',
    fontWeight: '600',
  },
  activeText: {
    color: '#fff',
  },
  content: {
    flex: 1,
  },
});