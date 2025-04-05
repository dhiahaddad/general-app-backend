import { createClient } from '@supabase/supabase-js';
import fetch from 'node-fetch';
import 'dotenv/config';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.EXPO_SECRET_SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, serviceRoleKey);

const sendPushNotification = async (content, deviceToken) => {
  const message = {
    to: deviceToken,
    sound: 'default',
    title: content.title,
    body: content.body,
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
// and send a push notification to the receiver when a new message is inserted
const channel = supabase
  .channel('realtime-push')
  .on(
    'postgres_changes',
    { event: '*', schema: 'public', table: 'messages' },
    async (payload) => {
      console.log('Change detected:', payload);

      const receiver_id = payload.new.receiver_id;
      const { data: receiverData, error } = await supabase
        .from('users')
        .select('first_name, last_name, device_token')
        .eq('uid', receiver_id)
        .single();
      if (error) {
        console.error('Error fetching receiver device token:', error);
        return;
      }
      const receiver_token = receiverData.device_token;

      if (payload.new) {
        const notificationContent = {
          title: `Nouveau message de la part de ${receiverData.first_name} ${receiverData.last_name}`,
          body: payload.new.content,
        };
        await sendPushNotification(notificationContent, receiver_token);
      }
    }
  )
  .subscribe();
