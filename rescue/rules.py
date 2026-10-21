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
        reasons.append("You contacted this address in the recently checked sent messages")
    if message.get("threadId") in sent_threads:
        reasons.append("This conversation includes a message you sent")
    # Authentication-Results is explanatory only: copied or forged headers are possible.
    auth = h.get("authentication-results", "").lower()
    warnings = []
    if any(flag in auth for flag in ("dmarc=fail", "dkim=fail", "spf=fail", "spf=softfail")):
        warnings.append("The headers report an authentication failure; verify the sender in Gmail")
    if not auth:
        warnings.append("No authentication results were available")
    return {
        "id": message["id"], "sender": h.get("from", "Unknown sender"),
        "subject": h.get("subject", "(No subject)"),
        "labels": message.get("labelIds", []), "reasons": reasons,
        "warnings": warnings, "candidate": bool(reasons),
    }
