import os
import logging
import re
import json
import requests

try:
    from env_loader import load_env
    load_env()
except ImportError:
    try:
        from ..env_loader import load_env
        load_env()
    except Exception:
        pass

logger = logging.getLogger(__name__)




def clean_indian_phone_number(phone: str) -> str:
    """Extract a clean 10-digit Indian phone number (strips +91, spaces, dashes)."""
    digits = re.sub(r"\D", "", phone or "")
    if len(digits) >= 10:
        return digits[-10:]
    return digits


def send_fast2sms(message: str, numbers: str = None) -> dict:
    """Send an SMS alert via Fast2SMS API to Indian phone numbers."""
    api_key = os.getenv("FAST2SMS_API_KEY")
    if not api_key:
        raise ValueError("FAST2SMS_API_KEY is not configured in .env")

    target_number = numbers or os.getenv("ALERT_PHONE_NUMBER")
    cleaned_number = clean_indian_phone_number(target_number)

    if not cleaned_number or len(cleaned_number) != 10:
        raise ValueError(f"Invalid Indian phone number: '{target_number}'. Must be a 10-digit number.")

    url = "https://www.fast2sms.com/dev/bulkV2"
    headers = {
        "authorization": api_key,
        "Content-Type": "application/json"
    }
    payload = {
        "route": "q",
        "message": message,
        "language": "english",
        "flash": 0,
        "numbers": cleaned_number
    }

    response = requests.post(url, headers=headers, json=payload, timeout=6)
    data = response.json()

    if not response.ok or not data.get("return"):
        err_msg = data.get("message", [response.text])
        if isinstance(err_msg, list):
            err_msg = ", ".join(str(m) for m in err_msg)
        logger.error(f"Fast2SMS API error: {err_msg}")
        raise RuntimeError(f"Fast2SMS Error: {err_msg}")

    logger.info(f"Fast2SMS sent successfully to {cleaned_number}. Request ID: {data.get('request_id')}")
    return data


def send_telegram_alert(message: str, chat_id: str = None) -> dict:
    """Send an emergency flood alert via Telegram Bot."""
    bot_token = os.getenv("TELEGRAM_BOT_TOKEN")
    target_chat_id = chat_id or os.getenv("TELEGRAM_CHAT_ID")

    if not bot_token or not target_chat_id:
        raise ValueError("Telegram bot token or Chat ID not configured in .env")

    url = f"https://api.telegram.org/bot{bot_token}/sendMessage"
    payload = {
        "chat_id": target_chat_id,
        "text": message,
        "parse_mode": "Markdown"
    }

    response = requests.post(url, json=payload, timeout=10)
    data = response.json()

    if not response.ok or not data.get("ok"):
        err = data.get("description", response.text)
        logger.error(f"Telegram alert delivery failed: {err}")
        raise RuntimeError(f"Telegram API Error: {err}")

    logger.info(f"Telegram alert sent successfully to chat {target_chat_id}")
    return data.get("result", {})


def send_sms(message: str, to: str = None) -> str:
    """Send an alert message with multi-channel fallback: Fast2SMS -> Telegram -> Twilio."""
    errors = []

    # 1. Try Fast2SMS (Indian SMS Route)
    fast2sms_key = os.getenv("FAST2SMS_API_KEY")
    if fast2sms_key:
        try:
            res = send_fast2sms(message, numbers=to)
            req_id = res.get("request_id", "fast2sms_sent")
            return f"fast2sms:{req_id}"
        except Exception as fe:
            logger.warning(f"Fast2SMS delivery failed ({str(fe)}), trying Telegram fallback...")
            errors.append(f"Fast2SMS: {str(fe)}")

    # 2. Try Telegram (Instant Push Notification)
    telegram_token = os.getenv("TELEGRAM_BOT_TOKEN")
    telegram_chat = os.getenv("TELEGRAM_CHAT_ID")
    if telegram_token and telegram_chat:
        try:
            res = send_telegram_alert(message, chat_id=to if (to and not to.startswith("+") and len(to) < 10) else None)
            msg_id = res.get("message_id", "telegram_sent")
            return f"telegram:{msg_id}"
        except Exception as te:
            logger.warning(f"Telegram delivery failed ({str(te)}), trying Twilio fallback...")
            errors.append(f"Telegram: {str(te)}")

    # 3. Twilio Fallback
    account_sid = os.getenv("TWILIO_ACCOUNT_SID")
    auth_token = os.getenv("TWILIO_AUTH_TOKEN")
    from_number = os.getenv("TWILIO_PHONE_NUMBER")
    to_number = to or os.getenv("ALERT_PHONE_NUMBER")

    if account_sid and auth_token and from_number and to_number:
        try:
            from_addr = from_number if from_number.startswith("whatsapp:") else f"whatsapp:{from_number}"
            to_addr = to_number if to_number.startswith("whatsapp:") else f"whatsapp:{to_number}"

            from twilio.rest import Client
            client = Client(account_sid, auth_token)


            if content_sid:
                sms = client.messages.create(
                    content_sid=content_sid,
                    from_=from_addr,
                    to=to_addr,
                    content_variables=json.dumps({"1": message})
                )
            else:
                sms = client.messages.create(
                    body=message,
                    from_=from_addr,
                    to=to_addr
                )
            logger.info(f"Alert sent successfully via Twilio. Message SID: {sms.sid}")
            return f"twilio:{sms.sid}"
        except Exception as tw_err:
            errors.append(f"Twilio: {str(tw_err)}")

    if errors:
        raise RuntimeError("All alert delivery channels failed: " + " | ".join(errors))

    raise ValueError("No alert channels configured. Please set FAST2SMS_API_KEY, TELEGRAM_BOT_TOKEN, or Twilio in .env")