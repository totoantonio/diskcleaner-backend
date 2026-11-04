const STORE_ID = 299929;   // cleandiskmac
const PRODUCT_ID = 1090440; // DiskCleaner

module.exports = async function handler(req, res) {
  // Only allow POST
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { license_key, instance_name, instance_id, mode } = req.body;

  if (!license_key) {
    return res.status(400).json({ valid: false, error: "No license key provided" });
  }

  // "validate" is the app's periodic re-check: it must never use up a device seat.
  const validate = mode === "validate";
  const params = { license_key };
  if (validate) {
    if (instance_id) params.instance_id = instance_id;
  } else {
    params.instance_name = instance_name || "DiskCleaner-Mac";
  }

  try {
    const response = await fetch(`https://api.lemonsqueezy.com/v1/licenses/${validate ? "validate" : "activate"}`, {
      method: "POST",
      headers: {
        "Accept": "application/json",
        "Content-Type": "application/x-www-form-urlencoded",
        "Authorization": `Bearer ${process.env.LEMONSQUEEZY_API_KEY}`,
      },
      body: new URLSearchParams(params),
    });

    const data = await response.json();

    // Only return safe info to the app — never expose raw LemonSqueezy response
    const ok = data.meta?.store_id === STORE_ID && data.meta?.product_id === PRODUCT_ID;
    if (ok && (validate ? data.valid === true : data.activated === true)) {
      return res.status(200).json({ valid: true, instance_id: data.instance?.id || instance_id });
    } else {
      return res.status(200).json({ valid: false, reason: data.error || "Invalid key" });
    }

  } catch (error) {
    return res.status(500).json({ valid: false, error: "Server error" });
  }
}
