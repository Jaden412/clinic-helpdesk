import { supabase } from './supabaseClient'

export async function createNotification(userId: string, ticketId: number, message: string) {
  await supabase.from('notifications').insert([{
    user_id: userId,
    ticket_id: ticketId,
    message: message,
  }])
}