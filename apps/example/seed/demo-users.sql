-- Local demo accounts only. Do not apply this file to production.
INSERT OR IGNORE INTO user (
  id, createdAt, updatedAt, email, emailVerified, name, role, banned
) VALUES
  ('demo-admin', datetime('now'), datetime('now'), 'admin@example.com', 1, 'Demo Admin', 'admin', 0),
  ('demo-staff', datetime('now'), datetime('now'), 'staff@example.com', 1, 'Demo Staff', 'staff', 0),
  ('demo-customer', datetime('now'), datetime('now'), 'customer@example.com', 1, 'Demo Customer', 'customer', 0);

INSERT OR IGNORE INTO account (
  id, createdAt, updatedAt, providerId, accountId, userId, password
) VALUES
  (
    'demo-admin-credential', datetime('now'), datetime('now'), 'credential', 'demo-admin',
    'demo-admin',
    '7601b5b5b1c88d10c4aa4f8036ccb1da:16fa4edb0495d706ce67088fc7332c4b573bc60557b8ed185205e51ee5b73894c67109b50e390797bd501360647931c07a97de6f62cd572202543c5730f0c85d'
  ),
  (
    'demo-staff-credential', datetime('now'), datetime('now'), 'credential', 'demo-staff',
    'demo-staff',
    'ae02510514612d69546092384845769a:4dfb9ceddbe2995997ff7f16802f4b8072594efb5601dd8aa298150d607fb0889db9495d7d3685443d9c486c92b2dfe8578507d8ba5806e96697e3a6a1b6062c'
  ),
  (
    'demo-customer-credential', datetime('now'), datetime('now'), 'credential', 'demo-customer',
    'demo-customer',
    'c899b709378458b7dcf7a6e2c09ccca0:6aa290429c258ac93f8a88b8e4fe1f4e896da53714c26db168223f6ff8d10092cdfb85615966bc32322850865b6d21e63a78f289e95b5a69dbf9b8c5732838a6'
  );
