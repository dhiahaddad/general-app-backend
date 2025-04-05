import { createClient } from '@supabase/supabase-js';
import fetch from 'node-fetch';
import 'dotenv/config';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.EXPO_SECRET_SUPABASE_SERVICE_ROLE_KEY;
const device_token = process.env.EXPO_DEVICE_TOKEN

const supabase = createClient(supabaseUrl, serviceRoleKey);

const sendPushNotification = async (deviceToken) => {
  const message = {
    to: deviceToken,
    sound: 'default',
    title: 'Hello 👋',
    body: 'This is a test push notification from Supabase + Expo!',
  };

  try {
    const response = await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(message),
    });

    const data = await response.json();
    console.log('Push Notification Response:', data);
  } catch (err) {
    console.error('Error sending push notification:', err);
  }
};

// Listen for changes in the 'messages' table
// and send a push notification when a new message is inserted
const channel = supabase
.channel('realtime-push')
.on(
  'postgres_changes',
  { event: '*', schema: 'public', table: 'messages' },
  async (payload) => {
    console.log('Change detected:', payload);

    if (payload.new) {
      await sendPushNotification(device_token);
    }
  }
)
.subscribe();
