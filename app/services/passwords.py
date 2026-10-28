"""Rejects passwords that attackers try first: leaked favourites, simple patterns, the user's own email."""
import re

# Most frequent passwords of 8+ characters in public breach lists, plus guesses specific to this site
COMMON = {
    "password", "password1", "password12", "password123", "password1234", "password2", "passw0rd", "p@ssw0rd",
    "p@ssword", "12345678", "123456789", "1234567890", "0123456789", "87654321", "12341234", "11223344",
    "112233445", "123123123", "147258369", "123456789a", "12345678a", "a12345678", "abc12345", "abcd1234",
    "abcdefgh", "qwerty12", "qwerty123", "qwerty1234", "qwertyui", "qwertyuiop", "1234qwer", "1q2w3e4r",
    "1q2w3e4r5t", "q1w2e3r4", "q1w2e3r4t5", "zaq12wsx", "1qaz2wsx", "123qweasd", "qweasdzxc", "asdfghjk",
    "asdfghjkl", "zxcvbnm1", "azerty123", "azertyuiop", "iloveyou", "iloveyou1", "sunshine", "princess",
    "football", "baseball", "superman", "starwars", "whatever", "trustno1", "welcome1", "welcome123",
    "admin123", "administrator", "letmein1", "changeme", "monkey123", "dragon123", "master123", "michelle",
    "jennifer", "computer", "internet", "liverpool", "chelsea1", "arsenal1", "butterfly", "sunflower",
    "baku1234", "azerbaijan", "azerbaycan", "azerbaijan1", "karabakh", "karabakh1", "qarabag1", "qarabagh",
    "gokarabakh", "shusha123", "susa1234",
}


def problem(password, email=""):
    """None when the password is acceptable, otherwise an error code."""
    lowered = password.lower()
    if lowered in COMMON:
        return "password_too_common"
    if len(set(lowered)) <= 2:                      # aaaaaaaa, abababab
        return "password_too_common"
    if lowered in "01234567890123456789" or lowered in "abcdefghijklmnopqrstuvwxyz" or lowered in "9876543210987654321":
        return "password_too_common"                # 23456789, cdefghij
    local = email.lower().split("@")[0]
    if email and (lowered == email.lower() or (len(local) >= 4 and re.sub(r"\d+$", "", lowered) == local)):
        return "password_like_email"
    return None
