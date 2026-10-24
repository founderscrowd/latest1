import { createClient } from "npm:@supabase/supabase-js@2.45.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface FileRecord {
  found: boolean;
  file_id?: string;
  group_id?: string;
  storage_path?: string;
  uploader_user_id?: string;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  if (req.method !== "DELETE") {
    return new Response(
      JSON.stringify({ error: "Method not allowed" }),
      { status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY");

    if (!supabaseUrl || !serviceRoleKey || !anonKey) {
      return new Response(
        JSON.stringify({ error: "Server configuration error" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Extract the user's JWT from the Authorization header
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Authentication required" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create a client with the user's JWT to verify their identity and role
    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: userError } = await userClient.auth.getUser();
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: "Authentication required" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Parse file_id from request body
    let fileId: string;
    try {
      const body = await req.json();
      fileId = body.file_id;
    } catch {
      return new Response(
        JSON.stringify({ error: "Invalid request body" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!fileId || typeof fileId !== "string") {
      return new Response(
        JSON.stringify({ error: "File ID is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Service-role client for privileged operations (storage deletion, cleanup function)
    const serviceClient = createClient(supabaseUrl, serviceRoleKey);

    // Step 1: Fetch the file record to get group_id, storage_path, uploader
    const { data: fileRecord, error: fetchError } = await serviceClient
      .from("group_files")
      .select("id, group_id, storage_path, uploader_user_id")
      .eq("id", fileId)
      .maybeSingle();

    if (fetchError || !fileRecord) {
      return new Response(
        JSON.stringify({ error: "File not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Step 2: Verify the caller's role in the file's group
    const { data: role, error: roleError } = await userClient
      .rpc("get_group_file_role", { p_group_id: fileRecord.group_id });

    if (roleError || !role) {
      return new Response(
        JSON.stringify({ error: "Access denied" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Step 3: Check deletion permission
    // Starter/Admin can delete any file in their group
    // Cofounder can only delete their own files
    if (role === "starter" || role === "admin") {
      // Allowed to delete any file in the group
    } else if (role === "cofounder") {
      if (fileRecord.uploader_user_id !== user.id) {
        return new Response(
          JSON.stringify({ error: "You can only delete files you uploaded" }),
          { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    } else {
      return new Response(
        JSON.stringify({ error: "You do not have permission to delete files" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Step 4: Delete the storage object via the Storage API
    const { error: storageError } = await serviceClient
      .storage
      .from("group-files")
      .remove([fileRecord.storage_path]);

    if (storageError) {
      console.error("[group-files-delete] Storage deletion failed:", storageError);
      // Continue to delete the database record anyway — we don't want orphaned
      // metadata pointing to a missing file, and the storage object may already
      // be gone. Log the error for investigation.
    }

    // Step 5: Delete the database record via cleanup_group_file (service role)
    const { error: cleanupError } = await serviceClient
      .rpc("cleanup_group_file", { p_file_id: fileId });

    if (cleanupError) {
      console.error("[group-files-delete] Database cleanup failed:", cleanupError);
      return new Response(
        JSON.stringify({ error: "Failed to delete file record" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ success: true }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (err) {
    console.error("[group-files-delete] Unexpected error:", err);
    return new Response(
      JSON.stringify({ error: "An unexpected error occurred" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
