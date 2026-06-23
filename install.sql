-- ============================================================
-- SMART EMAIL MANAGER - Schema Database
-- MySQL 8.0+ compatible, utf8mb4
-- ============================================================

SET FOREIGN_KEY_CHECKS = 0;
SET NAMES utf8mb4;
SET time_zone = '+01:00';

-- -----------------------------------------------
-- TABLE: utenti
-- -----------------------------------------------
CREATE TABLE IF NOT EXISTS utenti (
    id                  INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    nome                VARCHAR(100) NOT NULL,
    cognome             VARCHAR(100) NOT NULL,
    email               VARCHAR(255) NOT NULL,
    password_hash       VARCHAR(255) DEFAULT NULL,
    email_verified      TINYINT(1)   NOT NULL DEFAULT 0,
    avatar_url          VARCHAR(500) DEFAULT NULL,
    attivo              TINYINT(1)   NOT NULL DEFAULT 1,
    last_login          TIMESTAMP    NULL DEFAULT NULL,
    created_at          TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at          TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY uq_email (email),
    INDEX idx_attivo    (attivo),
    INDEX idx_verified  (email_verified)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------
-- TABLE: oauth_providers
-- Account social collegati all'utente
-- -----------------------------------------------
CREATE TABLE IF NOT EXISTS oauth_providers (
    id          INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    utente_id   INT UNSIGNED NOT NULL,
    provider    ENUM('google','apple','facebook') NOT NULL,
    provider_id VARCHAR(255) NOT NULL,
    created_at  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY uq_provider (provider, provider_id),
    CONSTRAINT fk_oauth_utente FOREIGN KEY (utente_id) REFERENCES utenti(id) ON DELETE CASCADE,
    INDEX idx_utente (utente_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------
-- TABLE: email_verification_tokens
-- -----------------------------------------------
CREATE TABLE IF NOT EXISTS email_verification_tokens (
    id          INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    utente_id   INT UNSIGNED NOT NULL,
    token       VARCHAR(128) NOT NULL,
    expires_at  TIMESTAMP    NOT NULL,
    used        TINYINT(1)   NOT NULL DEFAULT 0,
    created_at  TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY uq_token (token),
    CONSTRAINT fk_evt_utente FOREIGN KEY (utente_id) REFERENCES utenti(id) ON DELETE CASCADE,
    INDEX idx_utente (utente_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------
-- TABLE: password_reset_tokens
-- -----------------------------------------------
CREATE TABLE IF NOT EXISTS password_reset_tokens (
    id          INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    utente_id   INT UNSIGNED NOT NULL,
    token       VARCHAR(128) NOT NULL,
    expires_at  TIMESTAMP    NOT NULL,
    used        TINYINT(1)   NOT NULL DEFAULT 0,
    created_at  TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY uq_token (token),
    CONSTRAINT fk_prt_utente FOREIGN KEY (utente_id) REFERENCES utenti(id) ON DELETE CASCADE,
    INDEX idx_utente (utente_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------
-- TABLE: config_email_utente
-- Configurazione IMAP/SMTP per ogni utente
-- Le password sono cifrate con AES-256
-- -----------------------------------------------
CREATE TABLE IF NOT EXISTS config_email_utente (
    id              INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    utente_id       INT UNSIGNED NOT NULL,
    nome_display    VARCHAR(100) DEFAULT NULL,
    email_address   VARCHAR(255) NOT NULL,
    imap_host       VARCHAR(255) NOT NULL,
    imap_port       SMALLINT UNSIGNED NOT NULL DEFAULT 993,
    imap_secure     TINYINT(1)   NOT NULL DEFAULT 1,
    imap_user       VARCHAR(255) NOT NULL,
    imap_pass_enc   TEXT         NOT NULL,
    smtp_host       VARCHAR(255) NOT NULL,
    smtp_port       SMALLINT UNSIGNED NOT NULL DEFAULT 587,
    smtp_secure     TINYINT(1)   NOT NULL DEFAULT 0,
    smtp_user       VARCHAR(255) NOT NULL,
    smtp_pass_enc   TEXT         NOT NULL,
    attiva          TINYINT(1)   NOT NULL DEFAULT 1,
    sync_interval_min SMALLINT UNSIGNED NOT NULL DEFAULT 5,
    created_at      TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY uq_utente (utente_id),
    CONSTRAINT fk_config_utente FOREIGN KEY (utente_id) REFERENCES utenti(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------
-- TABLE: imap_sync_state
-- Ultimo UID sincronizzato per utente/cartella
-- -----------------------------------------------
CREATE TABLE IF NOT EXISTS imap_sync_state (
    id          INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    utente_id   INT UNSIGNED NOT NULL,
    folder      VARCHAR(255) NOT NULL DEFAULT 'INBOX',
    last_uid    INT UNSIGNED NOT NULL DEFAULT 0,
    last_sync   TIMESTAMP    NULL DEFAULT NULL,
    sync_status ENUM('OK','ERROR','RUNNING') NOT NULL DEFAULT 'OK',
    error_msg   TEXT         DEFAULT NULL,
    updated_at  TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY uq_utente_folder (utente_id, folder),
    CONSTRAINT fk_sync_utente FOREIGN KEY (utente_id) REFERENCES utenti(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------
-- TABLE: clienti
-- Rubrica clienti per utente
-- -----------------------------------------------
CREATE TABLE IF NOT EXISTS clienti (
    id              INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    utente_id       INT UNSIGNED NOT NULL,
    nome            VARCHAR(200) NOT NULL,
    cognome         VARCHAR(200) DEFAULT NULL,
    ragione_sociale VARCHAR(200) DEFAULT NULL,
    email           VARCHAR(255) DEFAULT NULL,
    telefono        VARCHAR(30)  DEFAULT NULL,
    sito_web        VARCHAR(255) DEFAULT NULL,
    indirizzo       VARCHAR(255) DEFAULT NULL,
    citta           VARCHAR(100) DEFAULT NULL,
    note            TEXT         DEFAULT NULL,
    attivo          TINYINT(1)   NOT NULL DEFAULT 1,
    created_at      TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_clienti_utente FOREIGN KEY (utente_id) REFERENCES utenti(id) ON DELETE CASCADE,
    INDEX idx_utente (utente_id),
    INDEX idx_attivo (attivo)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------
-- TABLE: progetti
-- Progetti collegati a clienti
-- -----------------------------------------------
CREATE TABLE IF NOT EXISTS progetti (
    id          INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    utente_id   INT UNSIGNED NOT NULL,
    cliente_id  INT UNSIGNED DEFAULT NULL,
    nome        VARCHAR(255) NOT NULL,
    descrizione TEXT         DEFAULT NULL,
    colore      VARCHAR(7)   DEFAULT '#0d6efd',
    stato       ENUM('APERTO','IN_CORSO','COMPLETATO','ARCHIVIATO') NOT NULL DEFAULT 'APERTO',
    data_scadenza DATE        DEFAULT NULL,
    attivo      TINYINT(1)   NOT NULL DEFAULT 1,
    created_at  TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at  TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_progetti_utente  FOREIGN KEY (utente_id)  REFERENCES utenti(id)  ON DELETE CASCADE,
    CONSTRAINT fk_progetti_cliente FOREIGN KEY (cliente_id) REFERENCES clienti(id) ON DELETE SET NULL,
    INDEX idx_utente  (utente_id),
    INDEX idx_cliente (cliente_id),
    INDEX idx_stato   (stato)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------
-- TABLE: stati_email
-- Stati personalizzabili per ogni utente
-- Gli stati di default vengono creati all'attivazione
-- -----------------------------------------------
CREATE TABLE IF NOT EXISTS stati_email (
    id          INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    utente_id   INT UNSIGNED NOT NULL,
    nome        VARCHAR(100) NOT NULL,
    colore      VARCHAR(7)   NOT NULL DEFAULT '#6c757d',
    icona       VARCHAR(50)  DEFAULT NULL,
    ordine      SMALLINT     NOT NULL DEFAULT 0,
    is_default  TINYINT(1)   NOT NULL DEFAULT 0,
    is_archivio TINYINT(1)   NOT NULL DEFAULT 0,
    created_at  TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at  TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_stati_utente FOREIGN KEY (utente_id) REFERENCES utenti(id) ON DELETE CASCADE,
    UNIQUE KEY uq_utente_nome (utente_id, nome),
    INDEX idx_utente (utente_id),
    INDEX idx_ordine (ordine)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------
-- TABLE: email_threads
-- Raggruppa email correlate (conversazione)
-- -----------------------------------------------
CREATE TABLE IF NOT EXISTS email_threads (
    id              INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    utente_id       INT UNSIGNED NOT NULL,
    thread_subject  VARCHAR(500) NOT NULL,
    email_count     INT UNSIGNED NOT NULL DEFAULT 1,
    last_email_at   TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_at      TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_threads_utente FOREIGN KEY (utente_id) REFERENCES utenti(id) ON DELETE CASCADE,
    INDEX idx_utente      (utente_id),
    INDEX idx_last_email  (last_email_at),
    INDEX idx_subject     (thread_subject(191))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------
-- TABLE: emails
-- Email sincronizzate dalla casella IMAP
-- -----------------------------------------------
CREATE TABLE IF NOT EXISTS emails (
    id               INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    utente_id        INT UNSIGNED NOT NULL,
    thread_id        INT UNSIGNED DEFAULT NULL,
    progetto_id      INT UNSIGNED DEFAULT NULL,
    stato_id         INT UNSIGNED DEFAULT NULL,

    -- Riferimento IMAP
    imap_uid         INT UNSIGNED NOT NULL,
    imap_message_id  VARCHAR(500) DEFAULT NULL,
    imap_in_reply_to VARCHAR(500) DEFAULT NULL,
    imap_references  TEXT         DEFAULT NULL,
    imap_folder      VARCHAR(255) NOT NULL DEFAULT 'INBOX',

    -- Campi email
    mittente         VARCHAR(500) NOT NULL,
    mittente_nome    VARCHAR(255) DEFAULT NULL,
    destinatari      TEXT         DEFAULT NULL,
    cc               TEXT         DEFAULT NULL,
    oggetto          VARCHAR(500) NOT NULL DEFAULT '(senza oggetto)',
    ora_ricezione    DATETIME     NOT NULL,
    has_attachments  TINYINT(1)   NOT NULL DEFAULT 0,
    letta            TINYINT(1)   NOT NULL DEFAULT 0,

    -- Cache corpo (on-demand)
    body_text_cache  LONGTEXT     DEFAULT NULL,
    body_html_cache  LONGTEXT     DEFAULT NULL,
    body_cached_at   TIMESTAMP    NULL DEFAULT NULL,

    -- Note utente
    nota             TEXT         DEFAULT NULL,

    archiviata       TINYINT(1)   NOT NULL DEFAULT 0,
    created_at       TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at       TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    CONSTRAINT fk_emails_utente   FOREIGN KEY (utente_id)   REFERENCES utenti(id)      ON DELETE CASCADE,
    CONSTRAINT fk_emails_thread   FOREIGN KEY (thread_id)   REFERENCES email_threads(id) ON DELETE SET NULL,
    CONSTRAINT fk_emails_progetto FOREIGN KEY (progetto_id) REFERENCES progetti(id)    ON DELETE SET NULL,
    CONSTRAINT fk_emails_stato    FOREIGN KEY (stato_id)    REFERENCES stati_email(id)  ON DELETE SET NULL,

    UNIQUE KEY uq_utente_imap   (utente_id, imap_uid, imap_folder),
    INDEX idx_utente            (utente_id),
    INDEX idx_stato             (stato_id),
    INDEX idx_progetto          (progetto_id),
    INDEX idx_thread            (thread_id),
    INDEX idx_archiviata        (archiviata),
    INDEX idx_ora_ricezione     (ora_ricezione),
    INDEX idx_letta             (letta),
    INDEX idx_imap_message_id   (imap_message_id(191))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------
-- TABLE: email_stato_log
-- Storico cambiamenti di stato di ogni email
-- -----------------------------------------------
CREATE TABLE IF NOT EXISTS email_stato_log (
    id              BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    email_id        INT UNSIGNED NOT NULL,
    utente_id       INT UNSIGNED NOT NULL,
    stato_da_id     INT UNSIGNED DEFAULT NULL,
    stato_a_id      INT UNSIGNED DEFAULT NULL,
    progetto_da_id  INT UNSIGNED DEFAULT NULL,
    progetto_a_id   INT UNSIGNED DEFAULT NULL,
    nota            TEXT         DEFAULT NULL,
    created_at      TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_log_email   FOREIGN KEY (email_id)  REFERENCES emails(id)      ON DELETE CASCADE,
    CONSTRAINT fk_log_utente  FOREIGN KEY (utente_id) REFERENCES utenti(id)      ON DELETE CASCADE,
    INDEX idx_email   (email_id),
    INDEX idx_utente  (utente_id),
    INDEX idx_created (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------
-- TABLE: email_attachments
-- -----------------------------------------------
CREATE TABLE IF NOT EXISTS email_attachments (
    id          INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    email_id    INT UNSIGNED NOT NULL,
    filename    VARCHAR(500) NOT NULL,
    mime_type   VARCHAR(200) NOT NULL DEFAULT 'application/octet-stream',
    size        INT UNSIGNED NOT NULL DEFAULT 0,
    content     LONGBLOB     NOT NULL,
    created_at  TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_attach_email FOREIGN KEY (email_id) REFERENCES emails(id) ON DELETE CASCADE,
    INDEX idx_email (email_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------
-- TABLE: email_sent
-- Email inviate (risposte, nuove)
-- -----------------------------------------------
CREATE TABLE IF NOT EXISTS email_sent (
    id              INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    utente_id       INT UNSIGNED NOT NULL,
    in_reply_to_id  INT UNSIGNED DEFAULT NULL,
    thread_id       INT UNSIGNED DEFAULT NULL,
    progetto_id     INT UNSIGNED DEFAULT NULL,
    destinatari     TEXT         NOT NULL,
    cc              TEXT         DEFAULT NULL,
    oggetto         VARCHAR(500) NOT NULL,
    corpo           LONGTEXT     NOT NULL,
    inviata_at      TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    smtp_error      TEXT         DEFAULT NULL,
    CONSTRAINT fk_sent_utente  FOREIGN KEY (utente_id)      REFERENCES utenti(id)       ON DELETE CASCADE,
    CONSTRAINT fk_sent_reply   FOREIGN KEY (in_reply_to_id) REFERENCES emails(id)       ON DELETE SET NULL,
    CONSTRAINT fk_sent_thread  FOREIGN KEY (thread_id)      REFERENCES email_threads(id) ON DELETE SET NULL,
    CONSTRAINT fk_sent_progetto FOREIGN KEY (progetto_id)   REFERENCES progetti(id)     ON DELETE SET NULL,
    INDEX idx_utente  (utente_id),
    INDEX idx_thread  (thread_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------
-- TABLE: notifiche
-- -----------------------------------------------
CREATE TABLE IF NOT EXISTS notifiche (
    id          INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    utente_id   INT UNSIGNED NOT NULL,
    tipo        VARCHAR(50)  NOT NULL,
    titolo      VARCHAR(255) NOT NULL,
    messaggio   TEXT         DEFAULT NULL,
    entity_type VARCHAR(50)  DEFAULT NULL,
    entity_id   INT UNSIGNED DEFAULT NULL,
    letta       TINYINT(1)   NOT NULL DEFAULT 0,
    created_at  TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_notifiche_utente FOREIGN KEY (utente_id) REFERENCES utenti(id) ON DELETE CASCADE,
    INDEX idx_utente_letta (utente_id, letta),
    INDEX idx_created      (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

SET FOREIGN_KEY_CHECKS = 1;

-- -----------------------------------------------
-- DATI INIZIALI: stati_email di default
-- Creati per ogni nuovo utente via trigger o codice
-- Questi sono i valori template da replicare
-- -----------------------------------------------
-- (gli stati vengono creati lato server al momento della registrazione)
