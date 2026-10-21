from email.utils import getaddresses


def headers(message):
    result = {}
    for item in message.get("payload", {}).get("headers", []):
        key = item["name"].lower()
        result[key] = result.get(key, "") + " " + item["value"]
    return {key: value.strip() for key, value in result.items()}


def addresses(value):
    return {address.lower() for _, address in getaddresses([value]) if "@" in address}


def assess(message, sent_addresses, sent_threads):
    h = headers(message)
    reasons = []
    if addresses(h.get("from", "")) & sent_addresses:
        reasons.append("你在最近检查的已发送邮件中联系过这个地址")
    if message.get("threadId") in sent_threads:
        reasons.append("这个会话中有你发送的邮件")
    # Authentication-Results is explanatory only: copied or forged headers are possible.
    auth = h.get("authentication-results", "").lower()
    warnings = []
    if any(flag in auth for flag in ("dmarc=fail", "dkim=fail", "spf=fail", "spf=softfail")):
        warnings.append("邮件头包含身份验证失败信息；请在 Gmail 中核实发件人")
    if not auth:
        warnings.append("未获取到身份验证结果")
    return {
        "id": message["id"], "sender": h.get("from", "未知发件人"),
        "subject": h.get("subject", "（无主题）"),
        "labels": message.get("labelIds", []), "reasons": reasons,
        "warnings": warnings, "candidate": bool(reasons),
    }
