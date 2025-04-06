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
    data: content.data,
  };
  console.log('Sending push notification:', message);

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
  .channel('messages-listener')
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
          data: {
            type: 'message',
            sender_id: payload.new.sender_id,
          },
        };
        await sendPushNotification(notificationContent, receiver_token);
      }
    }
  )
  .subscribe();

// Listen for changes in the 'messages' table
// and send a push notification to the receiver when a new message is inserted
const channel2 = supabase
  .channel('requests-listener')
  .on(
    'postgres_changes',
    { event: '*', schema: 'public', table: 'donation_requests' },
    async (payload) => {
      console.log('Change detected:', payload);

      const city = payload.new.city;
      const blood_type = payload.new.blood_type;
      const requester_id = payload.new.requester_id;
      const request_id = payload.new.id;

      const { data: matchingUsers, error: matchingUsersError } = await supabase
        .from('users')
        .select('uid, device_token')
        .eq('city', city)
        .eq('blood_type', blood_type)
        .neq('uid', requester_id);

      if (matchingUsersError) {
        console.error('Error fetching matching users:', matchingUsersError);
        return;
      }

      if (!matchingUsers || matchingUsers.length === 0) {
        console.log('No matching users found for the given city and blood type.');
        return;
      }
      console.log('Matching users:', matchingUsers);
      for (const user of matchingUsers) {
        const notificationContent = {
          title: 'Nouvelle demande de don de sang',
          body: `Une demande de don de sang pour le groupe ${blood_type} a été faite dans votre région (${city}).`,
          data: {
            type: 'request',
            request_id,
          },
        };
        await sendPushNotification(notificationContent, user.device_token);
      }
    }
  )
  .subscribe();
