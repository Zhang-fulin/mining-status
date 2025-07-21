import React, { useEffect, useState, useRef } from 'react';
import {
  Text,
  StyleSheet,
  ScrollView,
  View,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity,
  Alert,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = 'savedBtcAddress';

export default function App() {
  const [btcAddress, setBtcAddress] = useState('');
  const [confirmedAddress, setConfirmedAddress] = useState<string | null>(null);
  const [data, setData] = useState<any>(null);
  const dataRef = useRef<any>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const loadAddress = async () => {
      try {
        const savedAddress = await AsyncStorage.getItem(STORAGE_KEY);
        if (savedAddress) {
          setConfirmedAddress(savedAddress);
          setBtcAddress(savedAddress);
        }
      } catch (e) {
        console.warn('读取本地地址失败', e);
      }
    };
    loadAddress();
  }, []);

  const fetchData = async (address: string) => {
  setLoading(true);
  try {
    const API_URL = `https://solo.ckpool.org/users/${address}`;
    const res = await fetch(API_URL);
    if (!res.ok) throw new Error(`请求失败: ${res.status}`);
    const json = await res.json();

    if (!json.worker || json.worker.length === 0) {
      setConfirmedAddress(null);
      setData(null);
      dataRef.current = null;
      Alert.alert('提示', '该地址无效，请重新输入');
      return;
    }

    if (JSON.stringify(json) !== JSON.stringify(dataRef.current)) {
      setData(json);
      dataRef.current = json;
    }
  } catch (err) {
    setConfirmedAddress(null);
    setData(null);
    dataRef.current = null;
    Alert.alert('错误', '数据获取失败，请检查网络或地址是否正确');
    console.error('数据获取失败', err);
  }
  setLoading(false);
  };

  useEffect(() => {
    if (!confirmedAddress) return;
    fetchData(confirmedAddress);
    const interval = setInterval(() => fetchData(confirmedAddress), 10000);
    return () => clearInterval(interval);
  }, [confirmedAddress]);

  const onConfirmAddress = async () => {
    const addr = btcAddress.trim();
    if (addr) {
      setConfirmedAddress(addr);
      try {
        await AsyncStorage.setItem(STORAGE_KEY, addr);
      } catch (e) {
        console.warn('保存地址失败', e);
      }
    } else {
      Alert.alert('提示', '请输入有效的比特币地址');
    }
  };

  const onModifyAddress = async () => {
    setConfirmedAddress(null);
    setData(null);
    setBtcAddress('');
    dataRef.current = null;
    try {
      await AsyncStorage.removeItem(STORAGE_KEY);
    } catch (e) {
      console.warn('清除本地地址失败', e);
    }
  };

  const worker = data?.worker?.[0];

  const tsToTime = (ts: number) =>
    new Date(ts * 1000).toLocaleString('zh-CN', { hour12: false });

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: '#f0f0f5' }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        style={styles.container}
        contentContainerStyle={{ paddingBottom: 40 }}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.title}>矿工实时状态查询</Text>

        {!confirmedAddress ? (
          <>
            <TextInput
              style={styles.input}
              value={btcAddress}
              onChangeText={setBtcAddress}
              placeholder="请输入比特币地址"
              autoCapitalize="none"
              autoCorrect={false}
              clearButtonMode="while-editing"
            />

            <TouchableOpacity style={styles.button} onPress={onConfirmAddress}>
              <Text style={styles.buttonText}>查询</Text>
            </TouchableOpacity>
          </>
        ) : (
          worker && (
            <>
              <View style={styles.card}>
                <Text style={styles.label}>🔧 地址</Text>
                <Text selectable style={styles.address}>
                  {worker.workername}
                </Text>
              </View>

              <View style={styles.card}>
                <Text style={styles.label}>📊 实时算力</Text>
                <View style={styles.hashrateRow}>
                  <View style={styles.hashrateItem}>
                    <Text style={styles.hashrateLabel}>1m</Text>
                    <Text style={styles.hashrateValue}>{worker.hashrate1m}</Text>
                  </View>
                  <View style={styles.hashrateItem}>
                    <Text style={styles.hashrateLabel}>5m</Text>
                    <Text style={styles.hashrateValue}>{worker.hashrate5m}</Text>
                  </View>
                  <View style={styles.hashrateItem}>
                    <Text style={styles.hashrateLabel}>1h</Text>
                    <Text style={styles.hashrateValue}>{worker.hashrate1hr}</Text>
                  </View>
                </View>
              </View>

              <View style={styles.card}>
                <Text style={styles.label}>⏱ 最后提交</Text>
                <Text style={styles.time}>{tsToTime(worker.lastshare)}</Text>
              </View>

              <View style={styles.card}>
                <Text style={styles.label}>🕓 启动时间</Text>
                <Text style={styles.time}>{tsToTime(data.authorised)}</Text>
              </View>

              <TouchableOpacity
                style={[styles.button, { backgroundColor: '#888', marginBottom: 20 }]}
                onPress={onModifyAddress}
              >
                <Text style={styles.buttonText}>修改地址</Text>
              </TouchableOpacity>
            </>
          )
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 20,
    paddingTop: 50,
    backgroundColor: '#e8ecf4',
    flex: 1,
  },
  title: {
    fontSize: 28,
    fontWeight: '900',
    marginBottom: 25,
    textAlign: 'center',
    color: '#222',
  },
  input: {
    height: 44,
    borderColor: '#666',
    borderWidth: 1,
    borderRadius: 8,
    backgroundColor: '#fff',
    paddingHorizontal: 14,
    fontSize: 16,
    marginBottom: 12,
    color: '#1a1a1a',
  },
  button: {
    backgroundColor: '#4a90e2',
    borderRadius: 8,
    paddingVertical: 12,
    marginBottom: 24,
  },
  buttonText: {
    color: '#fff',
    textAlign: 'center',
    fontWeight: '700',
    fontSize: 18,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 18,
    marginBottom: 18,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.12,
    shadowRadius: 7,
    elevation: 6,
  },
  label: {
    fontWeight: '700',
    fontSize: 17,
    marginBottom: 10,
    color: '#333',
  },
  address: {
    fontSize: 16,
    color: '#1a1a1a',
    backgroundColor: '#eef6ff',
    padding: 10,
    borderRadius: 8,
    letterSpacing: 1,
  },
  hashrateRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
  },
  hashrateItem: {
    width: '30%',
    marginBottom: 12,
    backgroundColor: '#f5f9ff',
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 10,
    alignItems: 'center',
    shadowColor: '#87a7ff',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.3,
    shadowRadius: 2,
  },
  hashrateLabel: {
    fontSize: 14,
    color: '#5a7bd8',
    fontWeight: '600',
  },
  hashrateValue: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1c3d99',
    marginTop: 4,
  },
  time: {
    fontSize: 16,
    color: '#666',
    fontWeight: '600',
  },
});
