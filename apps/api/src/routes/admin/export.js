import { Hono } from "hono";
import { requireAuth } from "../../middleware/auth";
export const adminExportRoutes = new Hono();
function periodToMs(period, from, to) {
    const now = Date.now();
    if (period === "custom" && from && to) {
        return [parseInt(from, 10), parseInt(to, 10)];
    }
    const msMap = {
        "24h": 24 * 60 * 60 * 1000,
        "2d": 2 * 24 * 60 * 60 * 1000,
        "7d": 7 * 24 * 60 * 60 * 1000,
        "30d": 30 * 24 * 60 * 60 * 1000,
    };
    const ms = msMap[period] ?? msMap["7d"];
    return [now - ms, now];
}
function escapeCsv(val) {
    if (val === null || val === undefined)
        return "";
    const s = String(val);
    if (s.includes(",") || s.includes('"') || s.includes("\n")) {
        return `"${s.replace(/"/g, '""')}"`;
    }
    return s;
}
function fmtDate(ts) {
    if (!ts) return "";
    return new Date(Number(ts)).toISOString().replace("T", " ").slice(0, 19);
}
// ="..." forces Excel to treat the cell as text, preventing scientific notation for phone numbers
function fmtPhone(val) {
    if (!val) return "";
    return `="${val}"`;
}
function rowToCsv(fields) {
    return fields.map(escapeCsv).join(",");
}
adminExportRoutes.get("/", requireAuth(["admin"]), async (c) => {
    const { type, date_field, period, from, to, owner_status } = c.req.query();
    if (!type || !["customers", "owners"].includes(type)) {
        return c.json({ error: { code: "VALIDATION_ERROR", message: "type must be customers or owners" } }, 422);
    }
    const [fromMs, toMs] = periodToMs(period ?? "7d", from, to);
    const dateCol = date_field === "last_login" ? "last_login_at" : "created_at";
    let headers;
    let rows;
    if (type === "customers") {
        headers = "name,mobile,mobile_verified_at,signup_date,last_login_at";
        const result = await c.env.DB.prepare(`SELECT name, mobile, mobile_verified_at, created_at as signup_date, last_login_at
       FROM users WHERE role = 'customer' AND ${dateCol} >= ? AND ${dateCol} <= ?
       ORDER BY created_at DESC`)
            .bind(fromMs, toMs)
            .all();
        rows = result.results;
    }
    else {
        headers = "name,mobile,mobile_verified_at,vendor_type,status,company_name,licence_no,signup_date,last_login_at";
        const statusFilter = owner_status && owner_status !== "all" ? "AND vp.status = ?" : "";
        const params = [fromMs, toMs];
        if (owner_status && owner_status !== "all")
            params.push(owner_status);
        const result = await c.env.DB.prepare(`SELECT u.name, u.mobile, u.mobile_verified_at, vp.vendor_type, vp.status,
              vp.company_name, vp.licence_no, u.created_at as signup_date, u.last_login_at
       FROM vendor_profiles vp
       JOIN users u ON u.id = vp.user_id
       WHERE u.${dateCol} >= ? AND u.${dateCol} <= ? ${statusFilter}
       ORDER BY u.created_at DESC`)
            .bind(...params)
            .all();
        rows = result.results;
    }
    const lines = [headers];
    for (const row of rows) {
        let fields;
        if (type === "customers") {
            fields = [
                row.name,
                fmtPhone(row.mobile),
                fmtDate(row.mobile_verified_at),
                fmtDate(row.signup_date),
                fmtDate(row.last_login_at),
            ];
        } else {
            fields = [
                row.name,
                fmtPhone(row.mobile),
                fmtDate(row.mobile_verified_at),
                row.vendor_type,
                row.status,
                row.company_name,
                row.licence_no,
                fmtDate(row.signup_date),
                fmtDate(row.last_login_at),
            ];
        }
        lines.push(rowToCsv(fields));
    }
    const csv = lines.join("\r\n");
    const filename = `${type}-export-${fmtDate(Date.now()).slice(0, 10)}.csv`;
    return new Response(csv, {
        headers: {
            "Content-Type": "text/csv",
            "Content-Disposition": `attachment; filename="${filename}"`,
        },
    });
});
