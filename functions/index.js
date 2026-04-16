const {onDocumentCreated} = require("firebase-functions/v2/firestore");
const {onSchedule} = require("firebase-functions/v2/scheduler");
const {defineSecret} = require("firebase-functions/params");
const logger = require("firebase-functions/logger");
const {getFirestore} = require("firebase-admin/firestore");
const {initializeApp} = require("firebase-admin/app");

initializeApp();
const db = getFirestore();

const lettermintApiToken = defineSecret("LETTERMINT_API_TOKEN");
const lettermintFromEmail = defineSecret("LETTERMINT_FROM_EMAIL");

/**
 * Reads notification settings from Firestore and returns
 * { enabled, recipients } or null if notifications should
 * not be sent.
 */
async function getNotificationConfig() {
  const doc = await db.doc("settings/notifications").get();
  if (!doc.exists) return null;
  const settings = doc.data();
  if (!settings.enabled) return null;
  if (!settings.recipients || settings.recipients.length === 0) {
    return null;
  }
  return settings;
}

/**
 * Sends an email to matching recipients via LetterMint.
 * @param {string} category - "faults" or "expiry"
 * @param {string} subject - Email subject line
 * @param {string} html - Email HTML body
 */
async function sendEmail(category, subject, html) {
  const settings = await getNotificationConfig();
  if (!settings) {
    logger.info("sendEmail: notifications disabled or not configured");
    return;
  }

  // Filter recipients by category preference
  const matched = settings.recipients.filter((r) => {
    const cat = r.category || "both";
    return cat === "both" || cat === category;
  });

  if (matched.length === 0) {
    logger.info(`sendEmail: no recipients for category ${category}`);
    return;
  }

  const {Lettermint} = require("lettermint");
  const lettermint = new Lettermint({
    apiToken: lettermintApiToken.value(),
  });
  const fromEmail = lettermintFromEmail.value();

  for (const recipient of matched) {
    await lettermint.email
      .from(fromEmail)
      .to(recipient.email)
      .subject(subject)
      .html(html)
      .send();
    logger.info(`sendEmail: sent to ${recipient.email}`);
  }
}

/**
 * Builds an HTML table row for email templates.
 */
function emailRow(label, value) {
  return "<tr>" +
    "<td style=\"padding:8px;font-weight:bold;" +
    "border-bottom:1px solid #eee\">" + label + "</td>" +
    "<td style=\"padding:8px;" +
    "border-bottom:1px solid #eee\">" + value + "</td></tr>";
}

/**
 * Wraps table rows in a styled email layout.
 */
function emailWrapper(heading, color, rows) {
  return "<div style=\"font-family:Arial,sans-serif;" +
    "max-width:600px\">" +
    "<h2 style=\"color:" + color + "\">" + heading + "</h2>" +
    "<table style=\"border-collapse:collapse;width:100%\">" +
    rows +
    "</table>" +
    "<p style=\"margin-top:16px;color:#666;font-size:13px\">" +
    "Automated notification from FleetIQ.</p></div>";
}

/**
 * Formats a Firestore timestamp or date value to dd/mm/yy.
 */
function formatDate(val) {
  if (!val) return "N/A";
  try {
    const d = val.toDate ? val.toDate() : new Date(val);
    return d.toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "2-digit",
      year: "2-digit",
      timeZone: "UTC",
    });
  } catch (e) {
    return "N/A";
  }
}

// ── Expiry digest helpers ──────────────────────────────────

const EXPIRY_COLLECTIONS = {
  cvrts: "CVRT",
  taxes: "Tax",
  fireextinguishers: "Fire Extinguisher",
  firstaidkits: "First Aid Kit",
  tachocalibrations: "Tacho Calibration",
  psvs: "PSV",
};

/**
 * Builds an HTML digest email for expiring compliance records.
 * @param {Array<{type:string, registration:string,
 *   expiryDate:Date, daysRemaining:number}>} records
 * @return {string} HTML string
 */
function buildExpiryDigestHtml(records) {
  records.sort((a, b) => a.daysRemaining - b.daysRemaining);

  let rows = "";
  for (const r of records) {
    let color = "inherit";
    if (r.daysRemaining <= 7) color = "#d32f2f";
    else if (r.daysRemaining <= 14) color = "#e65100";

    rows +=
      "<tr style=\"color:" + color + "\">" +
      "<td style=\"padding:8px;border-bottom:1px solid #eee\">" +
        r.type + "</td>" +
      "<td style=\"padding:8px;border-bottom:1px solid #eee\">" +
        r.registration + "</td>" +
      "<td style=\"padding:8px;border-bottom:1px solid #eee\">" +
        formatDate(r.expiryDate) + "</td>" +
      "<td style=\"padding:8px;border-bottom:1px solid #eee\">" +
        r.daysRemaining + "</td>" +
      "</tr>";
  }

  const header =
    "<tr style=\"background:#f5f5f5;font-weight:bold\">" +
    "<td style=\"padding:8px;border-bottom:2px solid #ddd\">Category</td>" +
    "<td style=\"padding:8px;border-bottom:2px solid #ddd\">Registration</td>" +
    "<td style=\"padding:8px;border-bottom:2px solid #ddd\">Expiry Date</td>" +
    "<td style=\"padding:8px;border-bottom:2px solid #ddd\">Days Remaining</td>" +
    "</tr>";

  return "<div style=\"font-family:Arial,sans-serif;max-width:700px\">" +
    "<h2 style=\"color:#e65100\">Upcoming Compliance Expiries</h2>" +
    "<p>" + records.length + " record(s) expiring within your alert window.</p>" +
    "<table style=\"border-collapse:collapse;width:100%\">" +
    header + rows +
    "</table>" +
    "<p style=\"margin-top:16px;color:#666;font-size:13px\">" +
    "Automated notification from FleetIQ.</p></div>";
}

// ── Fault created trigger ──────────────────────────────────

exports.onFaultCreated = onDocumentCreated(
  {
    document: "faults/{faultId}",
    secrets: [lettermintApiToken, lettermintFromEmail],
  },
  async (event) => {
    const fault = event.data?.data();
    if (!fault) return;
    if (fault.status !== "open") return;

    const vehicle = fault.vehicle || "Unknown";
    const item = fault.item || "Unknown";

    let imageHtml = "";
    const images = fault.images || [];
    if (images.length > 0) {
      imageHtml = "<tr><td style=\"padding:8px;font-weight:bold;" +
        "border-bottom:1px solid #eee\" colspan=\"2\">Evidence Photos</td></tr>" +
        "<tr><td colspan=\"2\" style=\"padding:8px\">";
      for (const img of images) {
        imageHtml += "<a href=\"" + img.fileUrl + "\" target=\"_blank\">" +
          "<img src=\"" + img.fileUrl + "\" alt=\"" +
          (img.fileName || "photo") + "\" " +
          "style=\"max-width:200px;max-height:150px;border-radius:4px;" +
          "border:1px solid #ddd;margin:4px\" /></a>";
      }
      imageHtml += "</td></tr>";
    }

    const subject =
      `[FleetIQ] New Fault – ${vehicle} – ${item}`;

    const html = emailWrapper("New Fault Recorded", "#d32f2f",
      emailRow("Vehicle", vehicle) +
      emailRow("Item / Category", item) +
      emailRow("Description", fault.description || "None") +
      emailRow("Inspector", fault.inspector || "Unknown") +
      emailRow("Inspection Date", formatDate(fault.inspectionDate)) +
      emailRow("Priority", fault.priority || "normal") +
      imageHtml,
    );

    try {
      await sendEmail("faults", subject, html);
    } catch (err) {
      logger.error("onFaultCreated: failed to send email", err);
    }
  },
);

// ── Scheduled expiry check ─────────────────────────────────

const SCHEDULE_INTERVALS = {
  daily: 1,
  "every-3-days": 3,
  weekly: 7,
  fortnightly: 14,
};

exports.checkExpiringRecords = onSchedule(
  {
    schedule: "every day 07:00",
    timeZone: "Europe/Dublin",
    secrets: [lettermintApiToken, lettermintFromEmail],
  },
  async () => {
    const settingsRef = db.doc("settings/notifications");
    const settingsDoc = await settingsRef.get();
    const settings = settingsDoc.exists ? settingsDoc.data() : {};

    // Check if enough time has elapsed since the last digest
    const schedule = settings.expirySchedule || "daily";
    const intervalDays = SCHEDULE_INTERVALS[schedule] || 1;
    const lastSent = settings.lastExpiryDigestSent;

    if (lastSent && intervalDays > 1) {
      const lastSentDate = lastSent.toDate ? lastSent.toDate() : new Date(lastSent);
      const msSinceLast = Date.now() - lastSentDate.getTime();
      const daysSinceLast = msSinceLast / (1000 * 60 * 60 * 24);
      if (daysSinceLast < intervalDays - 0.5) {
        logger.info(
          `checkExpiringRecords: skipping, last sent ${daysSinceLast.toFixed(1)} ` +
          `days ago (schedule: ${schedule})`,
        );
        return;
      }
    }

    // Read configurable threshold (default 30 days)
    const threshold = settings.expiryThreshold ?? 30;

    const now = new Date();
    const startOfToday = new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()),
    );
    const cutoffDate = new Date(
      startOfToday.getTime() + threshold * 24 * 60 * 60 * 1000,
    );

    // Query all 6 collections in parallel
    const queries = Object.entries(EXPIRY_COLLECTIONS).map(
      async ([collection, label]) => {
        const snap = await db
          .collection(collection)
          .where("expiryDate", ">=", startOfToday)
          .where("expiryDate", "<=", cutoffDate)
          .get();

        return snap.docs.map((doc) => {
          const data = doc.data();
          const expiry = data.expiryDate.toDate();
          const daysRemaining = Math.ceil(
            (expiry - startOfToday) / (1000 * 60 * 60 * 24),
          );
          return {
            type: label,
            registration: data.registration || "Unknown",
            expiryDate: expiry,
            daysRemaining,
          };
        });
      },
    );

    const results = await Promise.all(queries);
    const records = results.flat();

    if (records.length === 0) {
      logger.info("checkExpiringRecords: no records expiring " +
        `within ${threshold} days`);
      return;
    }

    logger.info(
      `checkExpiringRecords: ${records.length} record(s) expiring ` +
      `within ${threshold} days`,
    );

    const subject =
      `[FleetIQ] ${records.length} Compliance Expir` +
      `${records.length === 1 ? "y" : "ies"} – Action Required`;
    const html = buildExpiryDigestHtml(records);

    try {
      await sendEmail("expiry", subject, html);
      await settingsRef.set(
        {lastExpiryDigestSent: new Date()},
        {merge: true},
      );
    } catch (err) {
      logger.error("checkExpiringRecords: failed to send digest", err);
    }
  },
);
