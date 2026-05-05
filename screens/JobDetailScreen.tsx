import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TextInput, Button, ActivityIndicator, Alert } from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import Signature from 'react-native-signature-canvas';
import * as Location from 'expo-location';

const API_URL = 'https://hvacflow-api-1w43.onrender.com';

type Job = {
  id: string;
  title: string;
  description: string;
  customer: { name: string; phone: string };
  site: { address: string; city: string };
  notes?: string;
  completed?: boolean;
};

const JobDetailScreen = () => {
  const route = useRoute<any>();
  const navigation = useNavigation<any>();
  const { jobId } = route.params;
  const [job, setJob] = useState<Job | null>(null);
  const [loading, setLoading] = useState(true);
  const [note, setNote] = useState('');
  const [signature, setSignature] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const fetchJob = async () => {
    const token = await SecureStore.getItemAsync('jwt');
    if (!token) return;
    try {
      const res = await fetch(`${API_URL}/jobs/${jobId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Failed');
      const data = await res.json();
      setJob(data);
      await AsyncStorage.setItem(`job_${jobId}`, JSON.stringify(data));
    } catch (e) {
      const cached = await AsyncStorage.getItem(`job_${jobId}`);
      if (cached) setJob(JSON.parse(cached));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchJob();
  }, []);

  const handleComplete = async () => {
    setSubmitting(true);
    try {
      const location = await Location.getCurrentPositionAsync({});
      const token = await SecureStore.getItemAsync('jwt');
      const res = await fetch(`${API_URL}/jobs/${jobId}/complete`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ notes: note, signature, location: location.coords }),
      });
      if (!res.ok) throw new Error('Submit failed');
      Alert.alert('Success', 'Job completed');
      navigation.goBack();
    } catch (e: any) {
      Alert.alert('Error', e.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  if (!job) return <Text>Job not found</Text>;

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{job.title}</Text>
      <Text>{job.description}</Text>
      <Text style={styles.section}>Customer</Text>
      <Text>{job.customer.name}</Text>
      <Text>{job.customer.phone}</Text>
      <Text style={styles.section}>Site</Text>
      <Text>{job.site.address}, {job.site.city}</Text>
      <TextInput placeholder="Add notes" value={note} onChangeText={setNote} style={styles.input} multiline />
      <Signature
        onOK={sig => setSignature(sig)}
        description="Sign here"
        clearText="Clear"
        confirmText="Save"
        webStyle="body{margin:0;padding:0;}"
        backgroundColor="#fff"
        penColor="#000"
        style={styles.signature}
      />
      <Button title={submitting ? 'Submitting...' : 'Complete Job'} onPress={handleComplete} disabled={submitting} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  title: { fontSize: 20, fontWeight: 'bold', marginBottom: 8 },
  section: { marginTop: 12, fontWeight: 'bold' },
  input: { borderColor: '#ccc', borderWidth: 1, marginVertical: 8, padding: 8, minHeight: 80 },
  signature: { height: 200, marginVertical: 8 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
});

export default JobDetailScreen;
