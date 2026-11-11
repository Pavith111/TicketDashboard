#!/usr/bin/env node
/**
 * Bootstrap the first helpdesk administrator.
 *
 *   node --env-file=.env.local scripts/create-admin.mjs "Full Name" admin@example.com "a-strong-password"
 *
 * If the auth user already exists, it is promoted to an active administrator.
 */
import { createClient } from "@supabase/supabase-js";

const [, , fullName, email, password] = process.argv;
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SECRET_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!fullName || !email || !password) {
  console.error('Usage: node --env-file=.env.local scripts/create-admin.mjs "Full Name" email password');
  process.exit(1);
}
if (!url || !key) {
  console.error("NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SECRET_KEY must be set.");
  process.exit(1);
}
if (password.length < 10) {
  console.error("Use a password of at least 10 characters.");
  process.exit(1);
}

const supabase = createClient(url, key, { auth: { persistSession: false } });

let userId;
const { data, error } = await supabase.auth.admin.createUser({
  email: email.toLowerCase(),
  password,
  email_confirm: true,
  user_metadata: { full_name: fullName },
});

if (error) {
  // Already registered? Look the user up instead.
  const { data: list, error: listError } = await supabase.auth.admin.listUsers({ perPage: 1000 });
  if (listError) throw listError;
  const existing = list.users.find((u) => u.email?.toLowerCase() === email.toLowerCase());
  if (!existing) {
    console.error("Could not create user:", error.message);
    process.exit(1);
  }
  userId = existing.id;
  console.log("User already exists, promoting to administrator…");
} else {
  userId = data.user.id;
}

const { error: profileError } = await supabase.from("profiles").upsert({
  id: userId,
  full_name: fullName,
  email: email.toLowerCase(),
  role: "admin",
  is_active: true,
});
if (profileError) {
  console.error("Could not create profile:", profileError.message);
  process.exit(1);
}

console.log(`✔ ${fullName} <${email}> is an active helpdesk administrator.`);
