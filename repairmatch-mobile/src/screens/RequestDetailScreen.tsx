// repairmatch-mobile/src/screens/RequestDetailScreen.tsx
import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View, ActivityIndicator, ScrollView, Alert } from 'react-native';
import { client } from '../services/client';

export default function RequestDetailScreen({ route }: { route?: any }) {
  const { requestId } = route?.params || { requestId: 1 }; // Recibe el ID de la solicitud seleccionada
  const [request, setRequest] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchRequestDetail();
  }, [requestId]);

  const fetchRequestDetail = async () => {
    try {
      const response = await client.get(`/requests/${requestId}`);
      setRequest(response.data);
    } catch (error) {
      Alert.alert('Error', 'No se pudo cargar el detalle de la solicitud');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#1B4D3E" />
      </View>
    );
  }

  if (!request) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>No se encontró la información.</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>Detalle de Solicitud #{request.id}</Text>
      
      <View style={styles.card}>
        <Text style={styles.label}>Estado:</Text>
        <Text style={styles.value}>{request.status || 'Pendiente'}</Text>

        <Text style={styles.label}>Descripción:</Text>
        <Text style={styles.value}>{request.description || 'Sin descripción'}</Text>

        <Text style={styles.label}>Electrodoméstico:</Text>
        <Text style={styles.value}>{request.applianceType || 'No especificado'}</Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#f5f5f5',
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
    color: '#111',
  },
  card: {
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  label: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#666',
    marginTop: 10,
  },
  value: {
    fontSize: 16,
    color: '#111',
    marginTop: 2,
  },
  errorText: {
    fontSize: 16,
    color: '#d9534f',
  },
});