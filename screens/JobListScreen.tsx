import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, ActivityIndicator, RefreshControl } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation } from '@react-navigation/native';
import * as SecureStore from 'expo-secure-store';

const API_URL = 'https://hvacflow-api-1w43.onrender.com';

type Job = {
  id: string;
  title: string;
  status: string;
  scheduledAt: string;
};

const JobListScreen = () => {
  const navigation = useNavigation<any>();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadJobs = async () => {
    const token = await SecureStore.getItemAsync('jwt');
    if (!token) return;
    try {
      const res = await fetch(`${API_URL}/jobs`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Failed to fetch');
      const data = await res.json();
      setJobs(data);
      await AsyncStorage.setItem('jobsCache', JSON.stringify(data));
    } catch (e) {
      // offline: load from cache
      const cached = await AsyncStorage.getItem('jobsCache');
      if (cached) setJobs(JSON.parse(cached));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadJobs();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    loadJobs();
  };

  const renderItem = ({ item }: { item: Job }) => (
    <TouchableOpacity style={styles.item} onPress={() => navigation.navigate('JobDetail', { jobId: item.id })}>
      <Text style={styles.title}>{item.title}</Text>
      <Text>{item.status}</Text>
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <FlatList
      data={jobs}
      keyExtractor={item => item.id}
      renderItem={renderItem}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      contentContainerStyle={jobs.length === 0 && styles.center}
      ListEmptyComponent={<Text>No jobs assigned.</Text>}
    />
  );
};

const styles = StyleSheet.create({
  item: { padding: 12, borderBottomWidth: 1, borderColor: '#eee' },
  title: { fontWeight: 'bold' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
});

export default JobListScreen;
