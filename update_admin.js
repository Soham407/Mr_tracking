const { createClient } = require('@supabase/supabase-js');

// Initialize Supabase client
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function updateUserToAdmin() {
  try {
    // First, sign in the user
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email: 'sohamb.artiset@gmail.com',
      password: '123456'
    });

    if (authError) {
      console.error('Authentication error:', authError);
      return;
    }

    // Update the user's profile to admin
    const { data: updateData, error: updateError } = await supabase
      .from('profiles')
      .update({ 
        role: 'admin',
        status: 'active'
      })
      .eq('email', 'sohamb.artiset@gmail.com')
      .select();

    if (updateError) {
      console.error('Update error:', updateError);
      return;
    }

    console.log('User updated to admin successfully:', updateData);
  } catch (error) {
    console.error('Error:', error);
  }
}

updateUserToAdmin(); 