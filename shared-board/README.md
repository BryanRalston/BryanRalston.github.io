# Shared Board

A general household board for any items, notes, and checkoffs.

There is no server. Everything stays in this browser unless you tap **Share update**, which encrypts the board with your household passphrase (12+ characters) using Web Crypto (PBKDF2 + AES-GCM) and puts the ciphertext in a URL hash (`#u=…`). Anyone with the link and the passphrase can merge that update on their device. The passphrase is required to share or open an update and is never sent anywhere.
