// ==UserScript==
// @name         iMonEcho - Suite Unifiee
// @namespace    http://tampermonkey.net/
// @version      1.3.1
// @description  Trames + IA + Dernier CR + MAJ dans un seul script avec profils.
// @author       Dr Sergent & Mathieu
// @match        *://*.imonecho.com/*
// @match        *://*.monecho.com/*
// @match        *://imonecho.com/*
// @match        *://monecho.com/*
// @updateURL    https://raw.githubusercontent.com/gozilla2a/imonecho/main/scripts/iMonEcho-Suite-Unifiee.meta.js
// @downloadURL  https://raw.githubusercontent.com/gozilla2a/imonecho/main/scripts/iMonEcho-Suite-Unifiee.user.js
// @run-at       document-idle
// @grant        GM_xmlhttpRequest
// @grant        GM_registerMenuCommand
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        unsafeWindow
// @connect      api.openai.com
// @connect      script.google.com
// @connect      script.googleusercontent.com
// ==/UserScript==

(function () {
  'use strict';
  if (window.self !== window.top) return;

  const APP_KEY = 'IMONECHO_SUITE_V1';
  const OLD_CLIP = 'iMonEcho_Clipboard_TRAME_V2';
  const EDITOR_IDS = ['texteexam', 'texte', 'cr_texteexam'];
  const OPENAI_ENDPOINT = 'https://api.openai.com/v1/responses';
  const OPENAI_AUDIO_ENDPOINT = 'https://api.openai.com/v1/audio/transcriptions';
  const DEFAULT_MODEL = 'gpt-4o-2024-08-06';
  const DEFAULT_TRAME_KEYWORD = 'sergent';
  const DEFAULT_EXAM_TYPE = 'auto';
  const DEFAULT_STT_LANG = 'fr-FR';
  const DEFAULT_STT_ENGINE = 'browser';
  const DEFAULT_STT_MODEL = 'gpt-4o-mini-transcribe';
  const DEFAULT_ECHOGRAPH_OPTIONS = [
    'Sonoscape S50',
    'Sonoscape P50',
    'GE Logic P9',
    'Autre echographe (a preciser)'
  ];
  const DRIVE_ENABLED_DEFAULT = true;
  const DRIVE_POLL_MS = 7000;
  const DRIVE_PUSH_DEBOUNCE_MS = 900;
  const USE_LEGACY_SHARED_CHANNELS = false;

  // Cloud sync endpoints (repris des scripts qui fonctionnaient)
  const DRIVE_BILLING_URL = 'https://script.google.com/macros/s/AKfycbxfbeQnGoi-0nVQbbX9LQIs2IdQEImDSKaGdOqQJQgSki6ciQP2OBMTOaX8L5repPM5xg/exec';
  const DRIVE_BILLING_KEY = 'Dgpoerp+559b68z45et54/*zet8*e56d5fujulil';

  const DRIVE_ORDOS_URL = 'https://script.google.com/macros/s/AKfycby97Nf9OqM3iTF9lWD9jYrTJ7HvkS6FHsLD9K7ANAROo283DbCsV_pdZLT_NV1Q4ytBZQ/exec';
  const DRIVE_ORDOS_KEY = '545415641g635df1g6dfgdgègthfhgfh//g+55';
  const DRIVE_ORDOS_NS = 'ordos';
  const DRIVE_PROFILES_NS = 'suite_profiles_v1';

  // Seeds issus des exports (pour conserver tes favoris existants dès la migration)
  const DEFAULT_BILLING_FAVS_B64 = 'WwogIHsKICAgICJsYWJlbCI6ICJ2ZWluZXV4IG1hcnF1YWdlIiwKICAgICJzdGVwcyI6IFsKICAgICAgewogICAgICAgICJzZWxlY3RUcGwiOiAic2VsZWN0X3tGSUR9IiwKICAgICAgICAidmFsdWUiOiAiODIzMSIsCiAgICAgICAgImxpbmUiOiB7CiAgICAgICAgICAiYW5wIjogIjEiLAogICAgICAgICAgInRwIjogIjcwIiwKICAgICAgICAgICJwYXJ0IjogIjAiCiAgICAgICAgfQogICAgICB9LAogICAgICB7CiAgICAgICAgInNlbGVjdFRwbCI6ICJzZWxlY3Rfe0ZJRH0iLAogICAgICAgICJ2YWx1ZSI6ICI4MjIyIiwKICAgICAgICAibGluZSI6IHsKICAgICAgICAgICJhbnAiOiAiMiIsCiAgICAgICAgICAidHAiOiAiNzAiLAogICAgICAgICAgInBhcnQiOiAiMCIKICAgICAgICB9CiAgICAgIH0KICAgIF0KICB9LAogIHsKICAgICJsYWJlbCI6ICJBcnTDqHJlcyBldCB2ZWluZXMiLAogICAgInN0ZXBzIjogWwogICAgICB7CiAgICAgICAgInNlbGVjdFRwbCI6ICJzZWxlY3Rfe0ZJRH0iLAogICAgICAgICJ2YWx1ZSI6ICI4MzE4IiwKICAgICAgICAibGluZSI6IHsKICAgICAgICAgICJhbnAiOiAiMSIsCiAgICAgICAgICAidHAiOiAiNzAiLAogICAgICAgICAgInBhcnQiOiAiMCIKICAgICAgICB9CiAgICAgIH0sCiAgICAgIHsKICAgICAgICAic2VsZWN0VHBsIjogInNlbGVjdF97RklEfSIsCiAgICAgICAgInZhbHVlIjogIjgzMjEiLAogICAgICAgICJsaW5lIjogewogICAgICAgICAgImFucCI6ICIyIiwKICAgICAgICAgICJ0cCI6ICI3MCIsCiAgICAgICAgICAicGFydCI6ICIwIgogICAgICAgIH0KICAgICAgfQogICAgXQogIH0sCiAgewogICAgImxhYmVsIjogImFydCBldCB2ZWluZXMgbWVtYnJlcyBzdXAiLAogICAgInN0ZXBzIjogWwogICAgICB7CiAgICAgICAgInNlbGVjdFRwbCI6ICJzZWxlY3Rfe0ZJRH0iLAogICAgICAgICJ2YWx1ZSI6ICI4MzI3IiwKICAgICAgICAibGluZSI6IHsKICAgICAgICAgICJhbnAiOiAiMSIsCiAgICAgICAgICAidHAiOiAiNzAiLAogICAgICAgICAgInBhcnQiOiAiMCIKICAgICAgICB9CiAgICAgIH0sCiAgICAgIHsKICAgICAgICAic2VsZWN0VHBsIjogInNlbGVjdF97RklEfSIsCiAgICAgICAgInZhbHVlIjogIjgzMTkiLAogICAgICAgICJsaW5lIjogewogICAgICAgICAgImFucCI6ICIyIiwKICAgICAgICAgICJ0cCI6ICI3MCIsCiAgICAgICAgICAicGFydCI6ICIwIgogICAgICAgIH0KICAgICAgfQogICAgXQogIH0sCiAgewogICAgImxhYmVsIjogIlRTYW8iLAogICAgInN0ZXBzIjogWwogICAgICB7CiAgICAgICAgInNlbGVjdFRwbCI6ICJzZWxlY3Rfe0ZJRH0iLAogICAgICAgICJ2YWx1ZSI6ICI4MzEyIiwKICAgICAgICAibGluZSI6IHsKICAgICAgICAgICJhbnAiOiAiMSIsCiAgICAgICAgICAidHAiOiAiNzAiLAogICAgICAgICAgInBhcnQiOiAiMCIKICAgICAgICB9CiAgICAgIH0KICAgIF0KICB9LAogIHsKICAgICJsYWJlbCI6ICJDb21wbGV0IHZlaW5ldXgiLAogICAgInN0ZXBzIjogWwogICAgICB7CiAgICAgICAgInNlbGVjdFRwbCI6ICJzZWxlY3Rfe0ZJRH0iLAogICAgICAgICJ2YWx1ZSI6ICI4MzEzIiwKICAgICAgICAibGluZSI6IHsKICAgICAgICAgICJhbnAiOiAiMSIsCiAgICAgICAgICAidHAiOiAiMCIsCiAgICAgICAgICAicGFydCI6ICIwIgogICAgICAgIH0KICAgICAgfSwKICAgICAgewogICAgICAgICJzZWxlY3RUcGwiOiAic2VsZWN0X3tGSUR9IiwKICAgICAgICAidmFsdWUiOiAiODMxNiIsCiAgICAgICAgImxpbmUiOiB7CiAgICAgICAgICAiYW5wIjogIjIiLAogICAgICAgICAgInRwIjogIjAiLAogICAgICAgICAgInBhcnQiOiAiMCIKICAgICAgICB9CiAgICAgIH0sCiAgICAgIHsKICAgICAgICAic2VsZWN0VHBsIjogInNlbGVjdF97RklEfSIsCiAgICAgICAgInZhbHVlIjogIjgzMTgiLAogICAgICAgICJsaW5lIjogewogICAgICAgICAgImFucCI6ICI1IiwKICAgICAgICAgICJ0cCI6ICIwIiwKICAgICAgICAgICJwYXJ0IjogIjAiCiAgICAgICAgfQogICAgICB9CiAgICBdCiAgfSwKICB7CiAgICAibGFiZWwiOiAiY29tcGxldCAqIiwKICAgICJzdGVwcyI6IFsKICAgICAgewogICAgICAgICJzZWxlY3RUcGwiOiAic2VsZWN0X3tGSUR9IiwKICAgICAgICAidmFsdWUiOiAiODMxMyIsCiAgICAgICAgImxpbmUiOiB7CiAgICAgICAgICAiYW5wIjogIjEiLAogICAgICAgICAgInRwIjogIjAiLAogICAgICAgICAgInBhcnQiOiAiMCIKICAgICAgICB9CiAgICAgIH0sCiAgICAgIHsKICAgICAgICAic2VsZWN0VHBsIjogInNlbGVjdF97RklEfSIsCiAgICAgICAgInZhbHVlIjogIjgzMTYiLAogICAgICAgICJsaW5lIjogewogICAgICAgICAgImFucCI6ICIyIiwKICAgICAgICAgICJ0cCI6ICIwIiwKICAgICAgICAgICJwYXJ0IjogIjAiCiAgICAgICAgfQogICAgICB9CiAgICBdCiAgfSwKICB7CiAgICAibGFiZWwiOiAic2Nsw6lyb3NlIDA3IiwKICAgICJzdGVwcyI6IFsKICAgICAgewogICAgICAgICJzZWxlY3RUcGwiOiAic2VsZWN0X3tGSUR9IiwKICAgICAgICAidmFsdWUiOiAiODA5MSIsCiAgICAgICAgImxpbmUiOiB7CiAgICAgICAgICAiYW5wIjogIjEiLAogICAgICAgICAgInRwIjogIjcwIiwKICAgICAgICAgICJwYXJ0IjogIjAiCiAgICAgICAgfQogICAgICB9LAogICAgICB7CiAgICAgICAgInNlbGVjdFRwbCI6ICJzZWxlY3Rfe0ZJRH0iLAogICAgICAgICJ2YWx1ZSI6ICI4MTEzIiwKICAgICAgICAibGluZSI6IHsKICAgICAgICAgICJhbnAiOiAiMSIsCiAgICAgICAgICAidHAiOiAiMCIsCiAgICAgICAgICAicGFydCI6ICIwIgogICAgICAgIH0KICAgICAgfQogICAgXQogIH0sCiAgewogICAgImxhYmVsIjogInVyZ2VuY2UiLAogICAgInN0ZXBzIjogWwogICAgICB7CiAgICAgICAgInNlbGVjdFRwbCI6ICJzZWxlY3Rfe0ZJRH0iLAogICAgICAgICJ2YWx1ZSI6ICI4MzE3IiwKICAgICAgICAibGluZSI6IHsKICAgICAgICAgICJhbnAiOiAiMSIsCiAgICAgICAgICAidHAiOiAiMCIsCiAgICAgICAgICAicGFydCI6ICIwIgogICAgICAgIH0KICAgICAgfSwKICAgICAgewogICAgICAgICJzZWxlY3RUcGwiOiAic2VsZWN0X3tGSUR9IiwKICAgICAgICAidmFsdWUiOiAiODIyMiIsCiAgICAgICAgImxpbmUiOiB7CiAgICAgICAgICAiYW5wIjogIjIiLAogICAgICAgICAgInRwIjogIjAiLAogICAgICAgICAgInBhcnQiOiAiMCIKICAgICAgICB9CiAgICAgIH0sCiAgICAgIHsKICAgICAgICAic2VsZWN0VHBsIjogInNlbGVjdF97RklEfSIsCiAgICAgICAgInZhbHVlIjogIjgzNDEiLAogICAgICAgICJsaW5lIjogewogICAgICAgICAgImFucCI6ICIxIiwKICAgICAgICAgICJ0cCI6ICIwIiwKICAgICAgICAgICJwYXJ0IjogIjAiCiAgICAgICAgfQogICAgICB9CiAgICBdCiAgfSwKICB7CiAgICAibGFiZWwiOiAic2Nsw6lyb3NlIDA3IDA3IiwKICAgICJzdGVwcyI6IFsKICAgICAgewogICAgICAgICJzZWxlY3RUcGwiOiAic2VsZWN0X3tGSUR9IiwKICAgICAgICAidmFsdWUiOiAiODA5MSIsCiAgICAgICAgImxpbmUiOiB7CiAgICAgICAgICAiYW5wIjogIjEiLAogICAgICAgICAgInRwIjogIjEwMCIsCiAgICAgICAgICAicGFydCI6ICIyNCIKICAgICAgICB9CiAgICAgIH0sCiAgICAgIHsKICAgICAgICAic2VsZWN0VHBsIjogInNlbGVjdF97RklEfSIsCiAgICAgICAgInZhbHVlIjogIjgwOTEiLAogICAgICAgICJsaW5lIjogewogICAgICAgICAgImFucCI6ICIyIiwKICAgICAgICAgICJ0cCI6ICIxMDAiLAogICAgICAgICAgInBhcnQiOiAiMCIKICAgICAgICB9CiAgICAgIH0sCiAgICAgIHsKICAgICAgICAic2VsZWN0VHBsIjogInNlbGVjdF97RklEfSIsCiAgICAgICAgInZhbHVlIjogIjg0ODciLAogICAgICAgICJsaW5lIjogewogICAgICAgICAgImFucCI6ICIxIiwKICAgICAgICAgICJ0cCI6ICIwIiwKICAgICAgICAgICJwYXJ0IjogIjAiCiAgICAgICAgfQogICAgICB9LAogICAgICB7CiAgICAgICAgInNlbGVjdFRwbCI6ICJzZWxlY3Rfe0ZJRH0iLAogICAgICAgICJ2YWx1ZSI6ICI4MTEzIiwKICAgICAgICAibGluZSI6IHsKICAgICAgICAgICJhbnAiOiAiMSIsCiAgICAgICAgICAidHAiOiAiMCIsCiAgICAgICAgICAicGFydCI6ICIwIgogICAgICAgIH0KICAgICAgfQogICAgXQogIH0sCiAgewogICAgImxhYmVsIjogInNjbMOpcm9zZSAyMSAwNyIsCiAgICAic3RlcHMiOiBbCiAgICAgIHsKICAgICAgICAic2VsZWN0VHBsIjogInNlbGVjdF97RklEfSIsCiAgICAgICAgInZhbHVlIjogIjgyMjQiLAogICAgICAgICJsaW5lIjogewogICAgICAgICAgImFucCI6ICIxIiwKICAgICAgICAgICJ0cCI6ICIxMDAiLAogICAgICAgICAgInBhcnQiOiAiMjQiCiAgICAgICAgfQogICAgICB9LAogICAgICB7CiAgICAgICAgInNlbGVjdFRwbCI6ICJzZWxlY3Rfe0ZJRH0iLAogICAgICAgICJ2YWx1ZSI6ICI4MDkxIiwKICAgICAgICAibGluZSI6IHsKICAgICAgICAgICJhbnAiOiAiMiIsCiAgICAgICAgICAidHAiOiAiMTAwIiwKICAgICAgICAgICJwYXJ0IjogIjAiCiAgICAgICAgfQogICAgICB9LAogICAgICB7CiAgICAgICAgInNlbGVjdFRwbCI6ICJzZWxlY3Rfe0ZJRH0iLAogICAgICAgICJ2YWx1ZSI6ICI4NDg3IiwKICAgICAgICAibGluZSI6IHsKICAgICAgICAgICJhbnAiOiAiMSIsCiAgICAgICAgICAidHAiOiAiMCIsCiAgICAgICAgICAicGFydCI6ICIwIgogICAgICAgIH0KICAgICAgfSwKICAgICAgewogICAgICAgICJzZWxlY3RUcGwiOiAic2VsZWN0X3tGSUR9IiwKICAgICAgICAidmFsdWUiOiAiODExMyIsCiAgICAgICAgImxpbmUiOiB7CiAgICAgICAgICAiYW5wIjogIjEiLAogICAgICAgICAgInRwIjogIjAiLAogICAgICAgICAgInBhcnQiOiAiMCIKICAgICAgICB9CiAgICAgIH0KICAgIF0KICB9LAogIHsKICAgICJsYWJlbCI6ICJzY2zDqXJvc2UgMDcgMTkiLAogICAgInN0ZXBzIjogWwogICAgICB7CiAgICAgICAgInNlbGVjdFRwbCI6ICJzZWxlY3Rfe0ZJRH0iLAogICAgICAgICJ2YWx1ZSI6ICI4MDkxIiwKICAgICAgICAibGluZSI6IHsKICAgICAgICAgICJhbnAiOiAiMSIsCiAgICAgICAgICAidHAiOiAiMTAwIiwKICAgICAgICAgICJwYXJ0IjogIjI0IgogICAgICAgIH0KICAgICAgfSwKICAgICAgewogICAgICAgICJzZWxlY3RUcGwiOiAic2VsZWN0X3tGSUR9IiwKICAgICAgICAidmFsdWUiOiAiODIyMyIsCiAgICAgICAgImxpbmUiOiB7CiAgICAgICAgICAiYW5wIjogIjIiLAogICAgICAgICAgInRwIjogIjEwMCIsCiAgICAgICAgICAicGFydCI6ICIwIgogICAgICAgIH0KICAgICAgfSwKICAgICAgewogICAgICAgICJzZWxlY3RUcGwiOiAic2VsZWN0X3tGSUR9IiwKICAgICAgICAidmFsdWUiOiAiODQ4NyIsCiAgICAgICAgImxpbmUiOiB7CiAgICAgICAgICAiYW5wIjogIjEiLAogICAgICAgICAgInRwIjogIjAiLAogICAgICAgICAgInBhcnQiOiAiMCIKICAgICAgICB9CiAgICAgIH0sCiAgICAgIHsKICAgICAgICAic2VsZWN0VHBsIjogInNlbGVjdF97RklEfSIsCiAgICAgICAgInZhbHVlIjogIjgxMTMiLAogICAgICAgICJsaW5lIjogewogICAgICAgICAgImFucCI6ICIxIiwKICAgICAgICAgICJ0cCI6ICIwIiwKICAgICAgICAgICJwYXJ0IjogIjAiCiAgICAgICAgfQogICAgICB9CiAgICBdCiAgfSwKICB7CiAgICAibGFiZWwiOiAic2Nsw6lyb3NlIHZhcmljb3NpdMOpIiwKICAgICJzdGVwcyI6IFsKICAgICAgewogICAgICAgICJzZWxlY3RUcGwiOiAic2VsZWN0X3tGSUR9IiwKICAgICAgICAidmFsdWUiOiAiODMzMSIsCiAgICAgICAgImxpbmUiOiB7CiAgICAgICAgICAiYW5wIjogIjEiLAogICAgICAgICAgInRwIjogIjcwIiwKICAgICAgICAgICJwYXJ0IjogIjAiCiAgICAgICAgfQogICAgICB9LAogICAgICB7CiAgICAgICAgInNlbGVjdFRwbCI6ICJzZWxlY3Rfe0ZJRH0iLAogICAgICAgICJ2YWx1ZSI6ICI4MzMxIiwKICAgICAgICAibGluZSI6IHsKICAgICAgICAgICJhbnAiOiAiMiIsCiAgICAgICAgICAidHAiOiAiNzAiLAogICAgICAgICAgInBhcnQiOiAiMCIKICAgICAgICB9CiAgICAgIH0sCiAgICAgIHsKICAgICAgICAic2VsZWN0VHBsIjogInNlbGVjdF97RklEfSIsCiAgICAgICAgInZhbHVlIjogIjk2NTIiLAogICAgICAgICJsaW5lIjogewogICAgICAgICAgImFucCI6ICIxIiwKICAgICAgICAgICJ0cCI6ICIwIiwKICAgICAgICAgICJwYXJ0IjogIjAiCiAgICAgICAgfQogICAgICB9CiAgICBdCiAgfSwKICB7CiAgICAibGFiZWwiOiAiY29tcGxldCAoMDAyKzAwNCkiLAogICAgInN0ZXBzIjogWwogICAgICB7CiAgICAgICAgInNlbGVjdFRwbCI6ICJzZWxlY3Rfe0ZJRH0iLAogICAgICAgICJ2YWx1ZSI6ICI4MzEzIiwKICAgICAgICAibGluZSI6IHsKICAgICAgICAgICJhbnAiOiAiMSIsCiAgICAgICAgICAidHAiOiAiMCIsCiAgICAgICAgICAicGFydCI6ICIwIgogICAgICAgIH0KICAgICAgfSwKICAgICAgewogICAgICAgICJzZWxlY3RUcGwiOiAic2VsZWN0X3tGSUR9IiwKICAgICAgICAidmFsdWUiOiAiODMxOCIsCiAgICAgICAgImxpbmUiOiB7CiAgICAgICAgICAiYW5wIjogIjIiLAogICAgICAgICAgInRwIjogIjAiLAogICAgICAgICAgInBhcnQiOiAiMCIKICAgICAgICB9CiAgICAgIH0KICAgIF0KICB9LAogIHsKICAgICJsYWJlbCI6ICJyw6luYWxlcyIsCiAgICAic3RlcHMiOiBbCiAgICAgIHsKICAgICAgICAic2VsZWN0VHBsIjogInNlbGVjdF97RklEfSIsCiAgICAgICAgInZhbHVlIjogIjgzMTYiLAogICAgICAgICJsaW5lIjogewogICAgICAgICAgImFucCI6ICIxIiwKICAgICAgICAgICJ0cCI6ICIwIiwKICAgICAgICAgICJwYXJ0IjogIjAiCiAgICAgICAgfQogICAgICB9LAogICAgICB7CiAgICAgICAgInNlbGVjdFRwbCI6ICJzZWxlY3Rfe0ZJRH0iLAogICAgICAgICJ2YWx1ZSI6ICI4MzE1IiwKICAgICAgICAibGluZSI6IHsKICAgICAgICAgICJhbnAiOiAiMiIsCiAgICAgICAgICAidHAiOiAiMCIsCiAgICAgICAgICAicGFydCI6ICIwIgogICAgICAgIH0KICAgICAgfQogICAgXQogIH0sCiAgewogICAgImxhYmVsIjogInNjbMOpcm9zZSAyMSAyMSIsCiAgICAic3RlcHMiOiBbCiAgICAgIHsKICAgICAgICAic2VsZWN0VHBsIjogInNlbGVjdF97RklEfSIsCiAgICAgICAgInZhbHVlIjogIjgyMjQiLAogICAgICAgICJsaW5lIjogewogICAgICAgICAgImFucCI6ICIxIiwKICAgICAgICAgICJ0cCI6ICIxMDAiLAogICAgICAgICAgInBhcnQiOiAiMjQiCiAgICAgICAgfQogICAgICB9LAogICAgICB7CiAgICAgICAgInNlbGVjdFRwbCI6ICJzZWxlY3Rfe0ZJRH0iLAogICAgICAgICJ2YWx1ZSI6ICI4MjIzIiwKICAgICAgICAibGluZSI6IHsKICAgICAgICAgICJhbnAiOiAiMiIsCiAgICAgICAgICAidHAiOiAiMTAwIiwKICAgICAgICAgICJwYXJ0IjogIjAiCiAgICAgICAgfQogICAgICB9LAogICAgICB7CiAgICAgICAgInNlbGVjdFRwbCI6ICJzZWxlY3Rfe0ZJRH0iLAogICAgICAgICJ2YWx1ZSI6ICI4NDg3IiwKICAgICAgICAibGluZSI6IHsKICAgICAgICAgICJhbnAiOiAiMSIsCiAgICAgICAgICAidHAiOiAiMCIsCiAgICAgICAgICAicGFydCI6ICIwIgogICAgICAgIH0KICAgICAgfSwKICAgICAgewogICAgICAgICJzZWxlY3RUcGwiOiAic2VsZWN0X3tGSUR9IiwKICAgICAgICAidmFsdWUiOiAiODExMyIsCiAgICAgICAgImxpbmUiOiB7CiAgICAgICAgICAiYW5wIjogIjEiLAogICAgICAgICAgInRwIjogIjAiLAogICAgICAgICAgInBhcnQiOiAiMCIKICAgICAgICB9CiAgICAgIH0KICAgIF0KICB9LAogIHsKICAgICJsYWJlbCI6ICJzY2zDqXJvc2UgMjEiLAogICAgInN0ZXBzIjogWwogICAgICB7CiAgICAgICAgInNlbGVjdFRwbCI6ICJzZWxlY3Rfe0ZJRH0iLAogICAgICAgICJ2YWx1ZSI6ICI4MjI0IiwKICAgICAgICAibGluZSI6IHsKICAgICAgICAgICJhbnAiOiAiMSIsCiAgICAgICAgICAidHAiOiAiMTAwIiwKICAgICAgICAgICJwYXJ0IjogIjI0IgogICAgICAgIH0KICAgICAgfSwKICAgICAgewogICAgICAgICJzZWxlY3RUcGwiOiAic2VsZWN0X3tGSUR9IiwKICAgICAgICAidmFsdWUiOiAiODQ4NyIsCiAgICAgICAgImxpbmUiOiB7CiAgICAgICAgICAiYW5wIjogIjEiLAogICAgICAgICAgInRwIjogIjAiLAogICAgICAgICAgInBhcnQiOiAiMCIKICAgICAgICB9CiAgICAgIH0sCiAgICAgIHsKICAgICAgICAic2VsZWN0VHBsIjogInNlbGVjdF97RklEfSIsCiAgICAgICAgInZhbHVlIjogIjgxMTMiLAogICAgICAgICJsaW5lIjogewogICAgICAgICAgImFucCI6ICIxIiwKICAgICAgICAgICJ0cCI6ICIwIiwKICAgICAgICAgICJwYXJ0IjogIjAiCiAgICAgICAgfQogICAgICB9CiAgICBdCiAgfSwKICB7CiAgICAibGFiZWwiOiAic2Nsw6lyb3NlIDA5IDA5IiwKICAgICJzdGVwcyI6IFsKICAgICAgewogICAgICAgICJzZWxlY3RUcGwiOiAic2VsZWN0X3tGSUR9IiwKICAgICAgICAidmFsdWUiOiAiODIyMyIsCiAgICAgICAgImxpbmUiOiB7CiAgICAgICAgICAiYW5wIjogIjEiLAogICAgICAgICAgInRwIjogIjEwMCIsCiAgICAgICAgICAicGFydCI6ICIyNCIKICAgICAgICB9CiAgICAgIH0sCiAgICAgIHsKICAgICAgICAic2VsZWN0VHBsIjogInNlbGVjdF97RklEfSIsCiAgICAgICAgInZhbHVlIjogIjgyMjMiLAogICAgICAgICJsaW5lIjogewogICAgICAgICAgImFucCI6ICIyIiwKICAgICAgICAgICJ0cCI6ICIxMDAiLAogICAgICAgICAgInBhcnQiOiAiMCIKICAgICAgICB9CiAgICAgIH0sCiAgICAgIHsKICAgICAgICAic2VsZWN0VHBsIjogInNlbGVjdF97RklEfSIsCiAgICAgICAgInZhbHVlIjogIjg0ODciLAogICAgICAgICJsaW5lIjogewogICAgICAgICAgImFucCI6ICIxIiwKICAgICAgICAgICJ0cCI6ICIwIiwKICAgICAgICAgICJwYXJ0IjogIjAiCiAgICAgICAgfQogICAgICB9LAogICAgICB7CiAgICAgICAgInNlbGVjdFRwbCI6ICJzZWxlY3Rfe0ZJRH0iLAogICAgICAgICJ2YWx1ZSI6ICI4MTEzIiwKICAgICAgICAibGluZSI6IHsKICAgICAgICAgICJhbnAiOiAiMSIsCiAgICAgICAgICAidHAiOiAiMCIsCiAgICAgICAgICAicGFydCI6ICIwIgogICAgICAgIH0KICAgICAgfQogICAgXQogIH0sCiAgewogICAgImxhYmVsIjogInZlaW5ldXggZXQgcGVsdmllbiIsCiAgICAic3RlcHMiOiBbCiAgICAgIHsKICAgICAgICAic2VsZWN0VHBsIjogInNlbGVjdF97RklEfSIsCiAgICAgICAgInZhbHVlIjogIjgyMzEiLAogICAgICAgICJsaW5lIjogewogICAgICAgICAgImFucCI6ICIxIiwKICAgICAgICAgICJ0cCI6ICI3MCIsCiAgICAgICAgICAicGFydCI6ICIwIgogICAgICAgIH0KICAgICAgfSwKICAgICAgewogICAgICAgICJzZWxlY3RUcGwiOiAic2VsZWN0X3tGSUR9IiwKICAgICAgICAidmFsdWUiOiAiODMxNiIsCiAgICAgICAgImxpbmUiOiB7CiAgICAgICAgICAiYW5wIjogIjIiLAogICAgICAgICAgInRwIjogIjcwIiwKICAgICAgICAgICJwYXJ0IjogIjAiCiAgICAgICAgfQogICAgICB9CiAgICBdCiAgfSwKICB7CiAgICAibGFiZWwiOiAic2Nsw6lyb3NlIDE5IiwKICAgICJzdGVwcyI6IFsKICAgICAgewogICAgICAgICJzZWxlY3RUcGwiOiAic2VsZWN0X3tGSUR9IiwKICAgICAgICAidmFsdWUiOiAiODIyMyIsCiAgICAgICAgImxpbmUiOiB7CiAgICAgICAgICAiYW5wIjogIjEiLAogICAgICAgICAgInRwIjogIjcwIiwKICAgICAgICAgICJwYXJ0IjogIjAiCiAgICAgICAgfQogICAgICB9LAogICAgICB7CiAgICAgICAgInNlbGVjdFRwbCI6ICJzZWxlY3Rfe0ZJRH0iLAogICAgICAgICJ2YWx1ZSI6ICI4MTEzIiwKICAgICAgICAibGluZSI6IHsKICAgICAgICAgICJhbnAiOiAiMSIsCiAgICAgICAgICAidHAiOiAiMCIsCiAgICAgICAgICAicGFydCI6ICIwIgogICAgICAgIH0KICAgICAgfQogICAgXQogIH0KXQ==';
  const DEFAULT_ORDOS_B64 = 'WwogIHsKICAgICJ0aXRsZSI6ICJEcmFpbmFnZSIsCiAgICAiaHRtbCI6ICJcbiAgICAgIDxwPjxzdHJvbmc+UsOpYWxpc2F0aW9uIGRlIDEwIHPDqWFuY2VzIGRlIGRyYWluYWdlIG1hbnVlbCBkZXMgbWVtYnJlcyBpbmbDqXJpZXVycyBvdSBwcsOpc3NvdGjDqXJhcGllIHBvdXIgcGhsw6lib2Vkw6htZTwvc3Ryb25nPjwvcD5cbiAgICAiCiAgfSwKICB7CiAgICAidGl0bGUiOiAiQmFzIGRlIGNvbnRlbnRpb24iLAogICAgImh0bWwiOiAiXG4gICAgICA8cD48c3Ryb25nPjIgcGFpcmVzIGRlIGJhcyBkZSBjb250ZW50aW9uIGNsYXNzZSAyPC9zdHJvbmc+PC9wPlxuICAgICI KICB9LAogIHsKICAgICJ0aXRsZSI6ICJDaGF1c3NldHRlcyBkZSBjb250ZW50aW9uIiwKICAgICJodG1sIjogIlxuICAgICAgPHA+PHN0cm9uZz4yIHBhaXJlcyBkZSBjaGF1c3NldHRlcyBkZSBjb250ZW50aW9uIGNsYXNzZSAyPC9zdHJvbmc+PC9wPlxuICAgICI KICB9LAogIHsKICAgICJ0aXRsZSI6ICJDb2xsYW50cyBkZSBDb250ZW50aW9uIiwKICAgICJodG1sIjogIlxuICAgICAgPHA+PHN0cm9uZz4yIHBhaXJlcyBkZSBjb2xsYW50cyBkZSBjb250ZW50aW9uIGNsYXNzZSAyPC9zdHJvbmc+PC9wPlxuICAgICI KICB9LAogIHsKICAgICJ0aXRsZSI6ICJFbGlxdWlzIiwKICAgICJodG1sIjogIjxwPjxzdHJvbmc+RWxpcXVpcyA1bWcgOjxicj4yIGNwIG1hdGluIGV0IHNvaXIgcGVuZGFudCA3IGpvdXJzPGJyPnB1aXM8YnI+MSBjcCBtYXRpbiBldCBzb2lyIHBlbmRhbnQgMyBtb2lzPC9zdHJvbmc+PC9wPiIKICB9LAogIHsKICAgICJ0aXRsZSI6ICJGbGVjdG9yIiwKICAgICJodG1sIjogIjxiPkZsZWN0b3IgR2VsIDEgdHViZSA6IDMgw6AgNCBhcHBsaWNhdGlvbnMgcGFyIGpvdXIgc3VyIGxhIHpvbmUgZG91bG91cmV1c2U8L2I+PHA+PHN0cm9uZz48L3N0cm9uZz48L3A+IgogIH0KXQ==';

  function b64ToJsonArray(b64, fallback) {
    try {
      const txt = decodeURIComponent(escape(atob(String(b64 || ''))));
      const arr = JSON.parse(txt);
      return Array.isArray(arr) ? arr : fallback;
    } catch (e) {
      return fallback;
    }
  }

  function clone(obj) {
    return JSON.parse(JSON.stringify(obj));
  }

  function normalizeEchographOptions(v) {
    const src = Array.isArray(v) ? v : [];
    const out = [];
    src.forEach((x) => {
      const s = String(x || '')
        .replace(/\s*\((?:19|20)\d{2}\)\s*/g, ' ')
        .replace(/\s{2,}/g, ' ')
        .trim();
      if (!s) return;
      if (!out.includes(s)) out.push(s);
    });
    return out.length ? out.slice(0, 8) : clone(DEFAULT_ECHOGRAPH_OPTIONS);
  }

  function isLegacyGenericEchographList(v) {
    const arr = Array.isArray(v) ? v : [];
    if (!arr.length) return false;
    return arr.every((x) => /^echographe\s+\d+$/i.test(String(x || '').trim()));
  }

  function escRe(v) {
    return String(v || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  const DEFAULT_BILLING_FAVS = b64ToJsonArray(DEFAULT_BILLING_FAVS_B64, []);
  const DEFAULT_ORDOS = b64ToJsonArray(DEFAULT_ORDOS_B64, []);

  let TRAMES = {};
  let LAST_PID = null;

  function mkProfile(name) {
    return {
      id: `p_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`,
      name: String(name || 'Mathieu'),
      key: '',
      model: DEFAULT_MODEL,
      trameKeyword: DEFAULT_TRAME_KEYWORD,
      examType: DEFAULT_EXAM_TYPE,
      sttLang: DEFAULT_STT_LANG,
      sttFilter: true,
      sttEngine: DEFAULT_STT_ENGINE,
      sttModel: DEFAULT_STT_MODEL,
      echographs: clone(DEFAULT_ECHOGRAPH_OPTIONS),
      uncertaintyOn: true,
      dictRaw: '',
      aiMode: 'hybride',
      aiBlockType: 'auto',
      aiBlockData: {},
      quickBillingFavIdx: 0,
      salutation: 'Cher Confrere,',
      clip: { title: '', html: '' },
      lastHtml: '',
      billingFavs: clone(DEFAULT_BILLING_FAVS),
      ordos: clone(DEFAULT_ORDOS),
      drive: {
        billingOn: USE_LEGACY_SHARED_CHANNELS ? DRIVE_ENABLED_DEFAULT : false,
        ordosOn: USE_LEGACY_SHARED_CHANNELS ? DRIVE_ENABLED_DEFAULT : false,
        billingRev: 0,
        ordosRev: 0
      }
    };
  }

  function loadState() {
    try {
      const s = JSON.parse(localStorage.getItem(APP_KEY) || '{}');
      if (!s || typeof s !== 'object') throw new Error('bad');
      if (!s.profiles || typeof s.profiles !== 'object') s.profiles = {};
      if (!s.activeId || !s.profiles[s.activeId]) s.activeId = Object.keys(s.profiles)[0] || '';
      return s;
    } catch (e) {
      return { profiles: {}, activeId: '', initDone: false };
    }
  }

  function ensureStateSchema(s) {
    if (!s || typeof s !== 'object') return;
    if (!s.sync || typeof s.sync !== 'object') s.sync = {};
    if (!Number.isFinite(s.sync.localTs)) s.sync.localTs = 0;
    if (!Number.isFinite(s.sync.profilesRemoteTs)) s.sync.profilesRemoteTs = 0;
  }

  let STATE = loadState();
  ensureStateSchema(STATE);

  function saveState(markLocalChange) {
    ensureStateSchema(STATE);
    if (markLocalChange !== false) STATE.sync.localTs = Date.now();
    localStorage.setItem(APP_KEY, JSON.stringify(STATE));
  }

  function ensureProfileSchema(p) {
    if (!p || typeof p !== 'object') return;
    if (!p.clip || typeof p.clip !== 'object') p.clip = { title: '', html: '' };
    if (!Array.isArray(p.billingFavs)) p.billingFavs = clone(DEFAULT_BILLING_FAVS);
    if (!Array.isArray(p.ordos)) p.ordos = clone(DEFAULT_ORDOS);
    if (!p.drive || typeof p.drive !== 'object') p.drive = { billingOn: USE_LEGACY_SHARED_CHANNELS ? DRIVE_ENABLED_DEFAULT : false, ordosOn: USE_LEGACY_SHARED_CHANNELS ? DRIVE_ENABLED_DEFAULT : false };
    if (typeof p.drive.billingOn !== 'boolean') p.drive.billingOn = USE_LEGACY_SHARED_CHANNELS ? DRIVE_ENABLED_DEFAULT : false;
    if (typeof p.drive.ordosOn !== 'boolean') p.drive.ordosOn = USE_LEGACY_SHARED_CHANNELS ? DRIVE_ENABLED_DEFAULT : false;
    if (!USE_LEGACY_SHARED_CHANNELS) {
      p.drive.billingOn = false;
      p.drive.ordosOn = false;
    }
    if (!Number.isFinite(p.drive.billingRev)) p.drive.billingRev = 0;
    if (!Number.isFinite(p.drive.ordosRev)) p.drive.ordosRev = 0;
    if (!p.model) p.model = DEFAULT_MODEL;
    if (typeof p.trameKeyword !== 'string') p.trameKeyword = DEFAULT_TRAME_KEYWORD;
    if (!p.examType) p.examType = DEFAULT_EXAM_TYPE;
    if (!p.sttLang) p.sttLang = DEFAULT_STT_LANG;
    if (typeof p.sttFilter !== 'boolean') p.sttFilter = true;
    if (!p.sttEngine) p.sttEngine = DEFAULT_STT_ENGINE;
    if (!p.sttModel) p.sttModel = DEFAULT_STT_MODEL;
    if (isLegacyGenericEchographList(p.echographs)) p.echographs = clone(DEFAULT_ECHOGRAPH_OPTIONS);
    else p.echographs = normalizeEchographOptions(p.echographs);
    if (typeof p.uncertaintyOn !== 'boolean') p.uncertaintyOn = true;
    if (typeof p.dictRaw !== 'string') p.dictRaw = '';
    if (typeof p.aiMode !== 'string') p.aiMode = 'hybride';
    if (typeof p.aiBlockType !== 'string') p.aiBlockType = 'auto';
    if (!p.aiBlockData || typeof p.aiBlockData !== 'object') p.aiBlockData = {};
    if (!Number.isFinite(p.quickBillingFavIdx)) p.quickBillingFavIdx = 0;
    p.quickBillingFavIdx = Math.max(0, Math.floor(Number(p.quickBillingFavIdx) || 0));
    if (!p.salutation) p.salutation = 'Cher Confrere,';
  }

  function gmRequestJson({ method, url, data, headers }) {
    return new Promise((resolve, reject) => {
      try {
        GM_xmlhttpRequest({
          method,
          url,
          data,
          headers: headers || {},
          timeout: 20000,
          onload: (r) => {
            try {
              resolve(JSON.parse(r.responseText || '{}'));
            } catch (e) {
              reject(new Error('Reponse JSON invalide'));
            }
          },
          onerror: () => reject(new Error('Erreur reseau Drive')),
          ontimeout: () => reject(new Error('Timeout Drive'))
        });
      } catch (e) {
        reject(e);
      }
    });
  }

  async function billingDriveGetMeta() {
    const url = `${DRIVE_BILLING_URL}?key=${encodeURIComponent(DRIVE_BILLING_KEY)}&meta=1`;
    const res = await gmRequestJson({ method: 'GET', url });
    if (!res || !res.ok) throw new Error(res?.error || 'Drive billing meta failed');
    return { rev: Number(res.rev) || 0, updatedAt: Number(res.updatedAt) || 0 };
  }
  async function billingDriveGetAll() {
    const url = `${DRIVE_BILLING_URL}?key=${encodeURIComponent(DRIVE_BILLING_KEY)}`;
    const res = await gmRequestJson({ method: 'GET', url });
    if (!res || !res.ok) throw new Error(res?.error || 'Drive billing get failed');
    return { favs: Array.isArray(res.favs) ? res.favs : [], rev: Number(res.rev) || 0 };
  }
  async function billingDrivePutAll(favs) {
    const url = `${DRIVE_BILLING_URL}?key=${encodeURIComponent(DRIVE_BILLING_KEY)}`;
    const res = await gmRequestJson({
      method: 'POST',
      url,
      data: JSON.stringify({ favs: Array.isArray(favs) ? favs : [] }),
      headers: { 'Content-Type': 'application/json' }
    });
    if (!res || !res.ok) throw new Error(res?.error || 'Drive billing post failed');
    return { rev: Number(res.rev) || 0, updatedAt: Number(res.updatedAt) || 0 };
  }

  async function ordosDriveGetMeta(ns) {
    const useNs = ns || DRIVE_ORDOS_NS;
    const url = `${DRIVE_ORDOS_URL}?key=${encodeURIComponent(DRIVE_ORDOS_KEY)}&ns=${encodeURIComponent(useNs)}&meta=1`;
    const res = await gmRequestJson({ method: 'GET', url });
    if (!res || !res.ok) throw new Error(res?.error || 'Drive ordos meta failed');
    return { rev: Number(res.rev) || 0, updatedAt: Number(res.updatedAt) || 0 };
  }
  async function ordosDriveGetAll(ns) {
    const useNs = ns || DRIVE_ORDOS_NS;
    const url = `${DRIVE_ORDOS_URL}?key=${encodeURIComponent(DRIVE_ORDOS_KEY)}&ns=${encodeURIComponent(useNs)}`;
    const res = await gmRequestJson({ method: 'GET', url });
    if (!res || !res.ok) throw new Error(res?.error || 'Drive ordos get failed');
    return { ordos: Array.isArray(res.ordos) ? res.ordos : [], rev: Number(res.rev) || 0 };
  }
  async function ordosDrivePutAll(ordos, ns) {
    const useNs = ns || DRIVE_ORDOS_NS;
    const url = `${DRIVE_ORDOS_URL}?key=${encodeURIComponent(DRIVE_ORDOS_KEY)}&ns=${encodeURIComponent(useNs)}`;
    const res = await gmRequestJson({
      method: 'POST',
      url,
      data: JSON.stringify({ ordos: Array.isArray(ordos) ? ordos : [] }),
      headers: { 'Content-Type': 'application/json' }
    });
    if (!res || !res.ok) throw new Error(res?.error || 'Drive ordos post failed');
    return { rev: Number(res.rev) || 0, updatedAt: Number(res.updatedAt) || 0 };
  }

  function encodeCloudState(stateObj) {
    return btoa(unescape(encodeURIComponent(JSON.stringify(stateObj || {}))));
  }
  function decodeCloudState(b64) {
    try {
      const txt = decodeURIComponent(escape(atob(String(b64 || ''))));
      return JSON.parse(txt);
    } catch (e) {
      return null;
    }
  }

  async function profilesDrivePush() {
    ensureStateSchema(STATE);
    const cur = profile();

    // Merge remote first, then update only the active profile.
    // This prevents overwriting another doctor's profile when both share the same cloud backend.
    const out = await ordosDriveGetAll(DRIVE_PROFILES_NS);
    const row = Array.isArray(out.ordos) ? out.ordos.find((x) => x && x.title === 'state') : null;
    const parsed = row && row.html ? decodeCloudState(row.html) : null;
    const remoteProfiles = (parsed && parsed.profiles && typeof parsed.profiles === 'object') ? parsed.profiles : {};
    const remoteTs = Number(parsed && parsed.ts) || 0;

    const localProfiles = (STATE.profiles && typeof STATE.profiles === 'object') ? STATE.profiles : {};
    const nextProfiles = clone(remoteProfiles);
    Object.entries(localProfiles).forEach(([id, p]) => { nextProfiles[id] = clone(p); });
    nextProfiles[cur.id] = clone(cur);
    Object.values(nextProfiles).forEach((p) => ensureProfileSchema(p));

    const ts = Math.max(Number(STATE.sync.localTs) || 0, remoteTs, Date.now());
    const payload = [{ title: 'state', html: encodeCloudState({ profiles: nextProfiles, activeId: STATE.activeId, ts }) }];
    await ordosDrivePutAll(payload, DRIVE_PROFILES_NS);

    STATE.profiles = nextProfiles;
    if (!STATE.profiles[STATE.activeId]) STATE.activeId = cur.id;
    STATE.sync.localTs = ts;
    STATE.sync.profilesRemoteTs = Math.max(Number(STATE.sync.profilesRemoteTs) || 0, ts);
    saveState(false);
  }
  async function profilesDrivePull(force) {
    const doForce = !!force;
    const out = await ordosDriveGetAll(DRIVE_PROFILES_NS);
    const row = Array.isArray(out.ordos) ? out.ordos.find((x) => x && x.title === 'state') : null;
    if (!row || !row.html) return false;
    const parsed = decodeCloudState(row.html);
    if (!parsed || !parsed.profiles || typeof parsed.profiles !== 'object') return false;
    const remoteTs = Number(parsed.ts) || 0;
    ensureStateSchema(STATE);
    const localTs = Number(STATE.sync.localTs) || 0;
    const knownRemoteTs = Number(STATE.sync.profilesRemoteTs) || 0;
    if (!doForce) {
      if (remoteTs && remoteTs <= Math.max(localTs, knownRemoteTs)) return false;
      if (!remoteTs && Object.keys(STATE.profiles || {}).length) return false;
    }
    const prevActive = STATE.activeId;
    const localProfiles = (STATE.profiles && typeof STATE.profiles === 'object') ? STATE.profiles : {};
    const remoteProfiles = parsed.profiles;
    const mergedProfiles = clone(localProfiles);
    Object.entries(remoteProfiles).forEach(([id, p]) => { mergedProfiles[id] = clone(p); });
    STATE.profiles = mergedProfiles;
    if (prevActive && STATE.profiles[prevActive]) STATE.activeId = prevActive;
    else if (parsed.activeId && STATE.profiles[parsed.activeId]) STATE.activeId = parsed.activeId;
    else STATE.activeId = Object.keys(STATE.profiles)[0] || '';
    Object.values(STATE.profiles).forEach((p) => ensureProfileSchema(p));
    STATE.sync.profilesRemoteTs = Math.max(knownRemoteTs, remoteTs || Date.now());
    if (remoteTs) STATE.sync.localTs = Math.max(localTs, remoteTs);
    saveState(false);
    return true;
  }

  let billingPushTimer = null;
  let ordosPushTimer = null;
  let profilesPushTimer = null;
  let syncBusy = false;
  let quickBillingBusy = false;

  function scheduleBillingPush() {
    if (!USE_LEGACY_SHARED_CHANNELS) return;
    try { clearTimeout(billingPushTimer); } catch (e) {}
    billingPushTimer = setTimeout(async () => {
      const p = profile();
      if (!p.drive?.billingOn) return;
      try {
        const out = await billingDrivePutAll(p.billingFavs || []);
        p.drive.billingRev = out.rev || p.drive.billingRev || 0;
        saveState(false);
      } catch (e) {}
    }, DRIVE_PUSH_DEBOUNCE_MS);
  }

  function scheduleOrdosPush() {
    if (!USE_LEGACY_SHARED_CHANNELS) return;
    try { clearTimeout(ordosPushTimer); } catch (e) {}
    ordosPushTimer = setTimeout(async () => {
      const p = profile();
      if (!p.drive?.ordosOn) return;
      try {
        const out = await ordosDrivePutAll(p.ordos || [], DRIVE_ORDOS_NS);
        p.drive.ordosRev = out.rev || p.drive.ordosRev || 0;
        saveState(false);
      } catch (e) {}
    }, DRIVE_PUSH_DEBOUNCE_MS);
  }

  function scheduleProfilesPush() {
    try { clearTimeout(profilesPushTimer); } catch (e) {}
    profilesPushTimer = setTimeout(async () => {
      try { await profilesDrivePush(); } catch (e) {}
    }, DRIVE_PUSH_DEBOUNCE_MS);
  }

  async function syncPullIfRemoteNewer() {
    if (syncBusy) return;
    syncBusy = true;
    try {
      const p = profile();
      if (USE_LEGACY_SHARED_CHANNELS && p.drive?.billingOn) {
        try {
          const meta = await billingDriveGetMeta();
          const localRev = Number(p.drive.billingRev) || 0;
          if (meta.rev > localRev) {
            const all = await billingDriveGetAll();
            p.billingFavs = Array.isArray(all.favs) ? all.favs : p.billingFavs;
            p.drive.billingRev = all.rev || meta.rev;
            saveState(false);
            renderBillingFavs();
          }
        } catch (e) {}
      }
      if (USE_LEGACY_SHARED_CHANNELS && p.drive?.ordosOn) {
        try {
          const meta = await ordosDriveGetMeta(DRIVE_ORDOS_NS);
          const localRev = Number(p.drive.ordosRev) || 0;
          if (meta.rev > localRev) {
            const all = await ordosDriveGetAll(DRIVE_ORDOS_NS);
            p.ordos = Array.isArray(all.ordos) ? all.ordos : p.ordos;
            p.drive.ordosRev = all.rev || meta.rev;
            saveState(false);
            renderOrdos();
          }
        } catch (e) {}
      }
      try {
        const pulled = await profilesDrivePull(false);
        if (pulled) {
          refreshDock();
          renderBillingFavs();
          renderOrdos();
        }
      } catch (e) {}
    } finally {
      syncBusy = false;
    }
  }

  function profile() {
    if (STATE.activeId && STATE.profiles[STATE.activeId]) {
      const cur = STATE.profiles[STATE.activeId];
      ensureProfileSchema(cur);
      return cur;
    }
    const ids = Object.keys(STATE.profiles);
    if (!ids.length) {
      const p = mkProfile('Mathieu');
      STATE.profiles[p.id] = p;
      STATE.activeId = p.id;
      saveState();
      return p;
    }
    STATE.activeId = ids[0];
    saveState();
    const out = STATE.profiles[STATE.activeId];
    ensureProfileSchema(out);
    return out;
  }

  function migrateLegacyClipboard() {
    const p = profile();
    if (p.clip && p.clip.html) return;
    const raw = localStorage.getItem(OLD_CLIP);
    if (!raw) return;
    try {
      const o = JSON.parse(raw);
      p.clip = { title: String(o && o.title || ''), html: String(o && o.html || '') };
    } catch (e) {
      p.clip = { title: '', html: String(raw || '') };
    }
    saveState();
  }

  function firstRunSetup() {
    if (STATE.initDone) return;
    const p = profile();
    ensureProfileSchema(p);
    const n = prompt('Initialisation iMonEcho Suite\nNom du premier profil :', p.name);
    if (n !== null && String(n).trim()) p.name = String(n).trim();
    if (confirm('Renseigner la cle OpenAI maintenant ?')) {
      const k = prompt('Cle OpenAI (sk-...) :', p.key || '');
      if (k !== null) {
        const v = String(k).trim();
        if (!v || v.startsWith('sk-') || v.startsWith('ssk-')) p.key = v;
      }
    }
    migrateLegacyClipboard();
    if (!Array.isArray(p.billingFavs) || !p.billingFavs.length) p.billingFavs = clone(DEFAULT_BILLING_FAVS);
    if (!Array.isArray(p.ordos) || !p.ordos.length) p.ordos = clone(DEFAULT_ORDOS);
    STATE.initDone = true;
    saveState();
    scheduleProfilesPush();
  }

  function allWins() {
    const out = [];
    const seen = new Set();
    function walk(w, d) {
      if (!w || seen.has(w) || d > 14) return;
      seen.add(w);
      out.push(w);
      try {
        w.document.querySelectorAll('iframe').forEach((fr) => {
          try { if (fr.contentWindow && fr.contentDocument) walk(fr.contentWindow, d + 1); } catch (e) {}
        });
      } catch (e) {}
    }
    try { walk(unsafeWindow.top, 0); } catch (e) {}
    walk(window, 0);
    return out;
  }

  function getTextarea(doc) {
    for (const id of EDITOR_IDS) {
      const el = doc.getElementById(id);
      if (el && String(el.tagName).toLowerCase() === 'textarea') return el;
    }
    return doc.querySelector('textarea#cr_texteexam, textarea[name="texteexam"], textarea[name="texte"]');
  }

  function findCtx() {
    for (const w of allWins()) {
      try {
        if (w.tinymce) {
          for (const id of EDITOR_IDS) {
            const ed = w.tinymce.get && w.tinymce.get(id);
            if (ed) return { win: w, doc: w.document, ed, ta: getTextarea(w.document) };
          }
          if (w.tinymce.activeEditor) return { win: w, doc: w.document, ed: w.tinymce.activeEditor, ta: getTextarea(w.document) };
        }
      } catch (e) {}
      try {
        const ta = getTextarea(w.document);
        if (ta) return { win: w, doc: w.document, ed: null, ta };
      } catch (e) {}
    }
    return null;
  }

  function dispatchAll(el) {
    try {
      el.dispatchEvent(new Event('input', { bubbles: true }));
      el.dispatchEvent(new Event('change', { bubbles: true }));
      el.dispatchEvent(new KeyboardEvent('keyup', { bubbles: true, key: ' ' }));
    } catch (e) {}
  }

  function readHtml() {
    const c = findCtx();
    if (!c) return '';
    try { if (c.ed) { const h = c.ed.getContent && c.ed.getContent() || ''; if (h.trim()) return h; } } catch (e) {}
    try { if (c.ta && c.ta.value && c.ta.value.trim()) return c.ta.value; } catch (e) {}
    try { const d = c.doc.getElementById('crdisplay'); if (d && d.innerHTML.trim()) return d.innerHTML; } catch (e) {}
    return '';
  }

  function writeHtml(html) {
    const c = findCtx();
    if (!c) return false;
    try {
      if (c.ed) {
        c.ed.setContent(html, { format: 'raw' });
        c.ed.setDirty && c.ed.setDirty(true);
        c.ed.fire && c.ed.fire('change');
        c.ed.fire && c.ed.fire('input');
        c.ed.save && c.ed.save();
        const ta = getTextarea(c.doc);
        if (ta) { ta.value = html; dispatchAll(ta); }
        return true;
      }
    } catch (e) {}
    try { if (c.ta) { c.ta.value = html; dispatchAll(c.ta); return true; } } catch (e) {}
    return false;
  }

  function getPatientID() {
    try {
      if (unsafeWindow.exam_patient_id && unsafeWindow.exam_patient_id !== '0') return String(unsafeWindow.exam_patient_id);
      if (unsafeWindow.patient_id && unsafeWindow.patient_id !== '0') return String(unsafeWindow.patient_id);
    } catch (e) {}
    const q = new URLSearchParams(location.search);
    return q.get('patient_id');
  }

  function patient() {
    const d = { nom: 'NOM', prenom: 'Prenom', naissance: '00/00/0000', age: '00', titre: '' };
    try {
      if (unsafeWindow.breadcrumbPatientLastname) d.nom = unsafeWindow.breadcrumbPatientLastname;
      if (unsafeWindow.breadcrumbPatientFirstname) d.prenom = unsafeWindow.breadcrumbPatientFirstname;
      if (unsafeWindow.breadcrumbPatientBirthDate) d.naissance = unsafeWindow.breadcrumbPatientBirthDate;
      const ageEl = document.getElementById('patientAgeInt');
      if (ageEl && ageEl.value) d.age = ageEl.value;
      if (typeof unsafeWindow.current_sexe_patient !== 'undefined') d.titre = String(unsafeWindow.current_sexe_patient) === '1' ? 'Monsieur' : 'Madame';
    } catch (e) {}
    return d;
  }

  function titleFields() {
    const sels = [
      '#titre', '#title', '#titreexam', '#titleexam',
      "input[name*='titre' i]", "input[id*='titre' i]",
      "input[name*='title' i]", "input[id*='title' i]",
      "input[name*='libelle' i]", "input[id*='libelle' i]",
      "textarea[name*='titre' i]", "textarea[id*='titre' i]"
    ];
    const out = [];
    sels.forEach((s) => document.querySelectorAll(s).forEach((el) => out.push(el)));
    return out.filter((el) => {
      if (!el || el.disabled) return false;
      const cs = getComputedStyle(el);
      if (cs.display === 'none' || cs.visibility === 'hidden' || Number(cs.opacity) === 0) return false;
      const r = el.getBoundingClientRect();
      return r.width > 0 && r.height > 0;
    });
  }

  function getTitle() {
    for (const el of titleFields()) {
      const v = String(el.value || '').trim();
      if (v) return v;
    }
    return '';
  }

  function setTitle(v) {
    const t = String(v || '').trim();
    if (!t) return false;
    const c = titleFields()[0];
    if (!c) return false;
    c.focus();
    c.value = t;
    c.dispatchEvent(new Event('input', { bubbles: true }));
    c.dispatchEvent(new Event('change', { bubbles: true }));
    c.blur();
    return true;
  }

  function todayFR() {
    try { return new Date().toLocaleDateString('fr-FR'); } catch (e) { return ''; }
  }

  function applyPatientVars(html) {
    const p = patient();
    const t = todayFR();
    let out = String(html || '');
    out = out.replace(/_todaydate_/g, t)
      .replace(/_patient_familyname_/g, p.nom)
      .replace(/_patient_firstname_/g, p.prenom)
      .replace(/_patient_age_/g, p.age)
      .replace(/_patient_datefr_/g, p.naissance)
      .replace(/_patient_title_/g, p.titre);
    out = out.replace(/(du|le)(\s+|&nbsp;)+\d{1,2}\/\d{1,2}\/\d{2,4}/gi, `$1 ${t}`);
    out = out.replace(/\bage\s*[:\-]?\s*\d{1,3}\s*ans\b/gi, `age: ${p.age} ans`);
    return out;
  }

  function parseTramesList(html) {
    const d = new DOMParser().parseFromString(html, 'text/html');
    TRAMES = {};
    const p = profile();
    const keys = String(p.trameKeyword || DEFAULT_TRAME_KEYWORD)
      .split(',')
      .map((x) => String(x || '').trim().toLowerCase())
      .filter(Boolean);
    d.querySelectorAll('#complexam_select option').forEach((opt) => {
      const text = String(opt.text || '');
      const textLow = text.toLowerCase();
      const id = String(opt.value || '');
      const isMatch = keys.length ? keys.some((k) => textLow.includes(k)) : textLow.includes(DEFAULT_TRAME_KEYWORD);
      if (id && isMatch) {
        let clean = text.replace(/^\*\s*/, '').trim();
        keys.forEach((k) => { clean = clean.replace(new RegExp(`\\s*-\\s*${escRe(k)}.*$`, 'i'), '').trim(); });
        if (clean) TRAMES[clean] = id;
      }
    });
    renderTrames();
  }

  function fetchTrames() {
    const pid = getPatientID() || '0';
    const x = new XMLHttpRequest();
    x.open('GET', `/monecho?rq=complexam_list&popup=true&patient_id=${pid}`, true);
    x.onreadystatechange = function () { if (x.readyState === 4 && x.status === 200) parseTramesList(x.responseText); };
    x.send();
  }

  function fetchTrameAndInject(id, fallbackTitle) {
    const pid = getPatientID() || '0';
    const x = new XMLHttpRequest();
    x.open('GET', `/monecho?rq=complexam_infos&complexam_id=${id}&popup=true&patient_id=${pid}`, true);
    x.onreadystatechange = function () {
      if (x.readyState !== 4) return;
      if (x.status !== 200) return alert('Erreur chargement trame.');
      const d = new DOMParser().parseFromString(x.responseText, 'text/html');
      let html = '';
      const ta = d.getElementById('texte') || d.getElementById('texteexam');
      if (ta) html = ta.value;
      else { const div = d.getElementById('crdisplay'); if (div) html = div.innerHTML; }
      let title = '';
      const cands = [d.querySelector('#titre'), d.querySelector('#title'), d.querySelector("input[name*='titre' i]"), d.querySelector("input[name*='title' i]")].filter(Boolean);
      for (const el of cands) { const v = String(el.value || el.textContent || '').trim(); if (v) { title = v; break; } }
      if (!title) title = fallbackTitle;
      if (!html || html.length < 10) return alert('Trame vide.');
      if (title) setTitle(title);
      writeHtml(applyPatientVars(html));
    };
    x.send();
  }

  function doCopy() {
    const h = readHtml();
    if (!h) return alert('Texte CR introuvable.');
    const p = profile();
    p.clip = { title: getTitle(), html: h };
    saveState();
    scheduleProfilesPush();
    refreshDock();
  }

  function doPaste() {
    const p = profile();
    if (!p.clip || !p.clip.html) return alert('Memoire vide pour ce profil.');
    if (p.clip.title) setTitle(p.clip.title);
    writeHtml(applyPatientVars(p.clip.html));
  }

  function anonymize(s, pat) {
    let out = String(s || '');
    function esc(v) { return String(v).replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }
    if (pat.nom && pat.nom.length > 2) out = out.replace(new RegExp(`\\b${esc(pat.nom)}\\b`, 'gi'), '[NOM]');
    if (pat.prenom && pat.prenom.length > 2) out = out.replace(new RegExp(`\\b${esc(pat.prenom)}\\b`, 'gi'), '[PRENOM]');
    if (pat.naissance && pat.naissance.length > 5) out = out.replace(new RegExp(esc(pat.naissance), 'g'), '[DOB]');
    if (pat.age) out = out.replace(new RegExp(`\\b${esc(pat.age)}\\b`, 'g'), '[AGE]');
    return out;
  }

  function deanonymize(s, pat) {
    return String(s || '').replace(/\[NOM\]/g, pat.nom).replace(/\[PRENOM\]/g, pat.prenom).replace(/\[DOB\]/g, pat.naissance).replace(/\[AGE\]/g, pat.age);
  }

  function stripFences(s) { return String(s || '').replace(/```(?:html|json)?/gi, '').replace(/```/g, '').trim(); }

  function extractAI(resp) {
    const out = resp && resp.output;
    if (!Array.isArray(out)) return '';
    for (const item of out) {
      if (item && item.type === 'message' && item.role === 'assistant' && Array.isArray(item.content)) {
        const txt = item.content.filter((c) => c && c.type === 'output_text' && typeof c.text === 'string').map((c) => c.text).join('');
        if (txt) return txt;
      }
    }
    return '';
  }

  function aiCall(system, user, temp) {
    const p = profile();
    if (!p.key) return Promise.reject(new Error('Aucune cle OpenAI pour ce profil.'));
    return new Promise((resolve, reject) => {
      GM_xmlhttpRequest({
        method: 'POST',
        url: OPENAI_ENDPOINT,
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${p.key}` },
        data: JSON.stringify({
          model: p.model || DEFAULT_MODEL,
          temperature: typeof temp === 'number' ? temp : 0.2,
          input: [
            { role: 'system', content: [{ type: 'input_text', text: system }] },
            { role: 'user', content: [{ type: 'input_text', text: user }] }
          ]
        }),
        onload: (r) => {
          try {
            if (r.status < 200 || r.status >= 300) return reject(new Error(`HTTP ${r.status}`));
            const text = extractAI(JSON.parse(r.responseText));
            if (!text) return reject(new Error('Reponse IA vide.'));
            resolve(text);
          } catch (e) { reject(e); }
        },
        onerror: () => reject(new Error('Erreur reseau OpenAI'))
      });
    });
  }

  function findDernierBtn(doc) {
    const els = Array.from(doc.querySelectorAll('button, a, input[type="button"], input[type="submit"], [role="button"]'));
    for (const el of els) {
      const t = String(el.innerText || el.value || el.textContent || '').trim().toLowerCase();
      if (!t) continue;
      if (t.includes('dernier') && t.includes('cr')) return el;
      if (t.includes('dernier compte')) return el;
    }
    return null;
  }

  function patchDateAge(html) {
    const p = patient();
    const t = todayFR();
    let out = String(html || '');
    const SEP0 = '(?:\\s|&nbsp;|<[^>]+>)*';
    const SEP1 = '(?:\\s|&nbsp;|<[^>]+>)+';
    const DATE_ANY = '\\d{1,2}[\\/\\-.]\\d{1,2}[\\/\\-.]\\d{2,4}';
    const DATE_CAP = '(\\d{1,2}[\\/\\-.]\\d{1,2}[\\/\\-.]\\d{2,4})';

    const RE_DULEAU = new RegExp(`\\b(du|le|au)${SEP1}${DATE_CAP}\\b`, 'gi');
    const RE_ENDATE = new RegExp(`\\b(en${SEP1}date${SEP1}(?:du|de))${SEP1}${DATE_ANY}\\b`, 'gi');
    const RE_DATE = new RegExp(`\\b(Date)${SEP0}[:\\-]${SEP0}${DATE_ANY}\\b`, 'gi');
    const RE_DATE_EXAM = new RegExp(`\\b(Date${SEP1}(?:de${SEP1})?(?:l['’]?)?examen)${SEP0}[:\\-]${SEP0}${DATE_ANY}\\b`, 'gi');
    const RE_FAIT = new RegExp(`\\b(Fait${SEP1}(?:a[^\\n<]{0,80}?${SEP0})?le)${SEP1}${DATE_ANY}\\b`, 'gi');

    out = out.replace(RE_DULEAU, (m, g1) => `${g1} ${t}`);
    out = out.replace(RE_ENDATE, `en date du ${t}`);
    out = out.replace(RE_FAIT, (m, g1) => `${g1} ${t}`);
    out = out.replace(RE_DATE, `Date : ${t}`);
    out = out.replace(RE_DATE_EXAM, `Date de l'examen : ${t}`);

    if (p.age && /^\d{1,3}$/.test(String(p.age))) {
      const RE_AGE1 = new RegExp(`\\b([aâ]g[eé]e?(?:e)?${SEP1}de${SEP1})\\d{1,3}${SEP0}ans\\b`, 'gi');
      const RE_AGE2 = new RegExp(`\\b([aâ]ge|age)${SEP0}[:\\-]${SEP0}\\d{1,3}${SEP0}ans\\b`, 'gi');
      const RE_AGE3 = new RegExp(`\\b\\d{1,3}${SEP0}ans\\b`, 'gi');
      out = out.replace(RE_AGE1, (m, g1) => `${g1}${p.age} ans`);
      out = out.replace(RE_AGE2, (m, g1) => `${g1}: ${p.age} ans`);
      out = out.replace(RE_AGE3, `${p.age} ans`);
    }

    if (p.naissance && /^\d{1,2}\/\d{1,2}\/\d{4}$/.test(String(p.naissance))) {
      const RE_BIRTH_HTML = new RegExp(`\\b(n&eacute;|n[eé])\\s*\\(?e\\)?${SEP1}le${SEP1}${DATE_ANY}\\b`, 'gi');
      const RE_BIRTH_NEE = new RegExp(`\\b(n[eé]e)${SEP1}le${SEP1}${DATE_ANY}\\b`, 'gi');
      const RE_BIRTH_NE = new RegExp(`\\b(n[eé])${SEP1}le${SEP1}${DATE_ANY}\\b`, 'gi');
      out = out.replace(RE_BIRTH_HTML, `n&eacute;(e) le ${p.naissance}`);
      out = out.replace(RE_BIRTH_NEE, `nee le ${p.naissance}`);
      out = out.replace(RE_BIRTH_NE, `ne le ${p.naissance}`);
    }
    return out;
  }

  function runDernierCRMaj() {
    const before = readHtml();
    let clicked = false;
    for (const w of allWins()) {
      try {
        const b = findDernierBtn(w.document);
        if (b) { b.click(); clicked = true; break; }
      } catch (e) {}
    }
    if (!clicked) return alert('Bouton Dernier CR introuvable.');

    const start = Date.now();
    let done = false;
    const timer = setInterval(() => {
      if (done || Date.now() - start > 30000) { clearInterval(timer); return; }
      const now = readHtml();
      if (!now || now.length < 80) return;
      if (before && now === before) return;
      const patched = patchDateAge(now);
      if (patched !== now) writeHtml(patched);
      done = true;
      clearInterval(timer);
    }, 250);

    setTimeout(() => {
      if (done) return;
      const now = readHtml();
      if (!now || now.length < 40) return;
      const patched = patchDateAge(now);
      if (patched !== now) writeHtml(patched);
      done = true;
      try { clearInterval(timer); } catch (e) {}
    }, 1100);
  }

  function sleep(ms) { return new Promise((r) => setTimeout(r, ms)); }
  async function waitFor(fn, timeout, interval) {
    const to = typeof timeout === 'number' ? timeout : 20000;
    const iv = typeof interval === 'number' ? interval : 140;
    const start = Date.now();
    while (Date.now() - start < to) {
      const v = (() => { try { return fn(); } catch (e) { return null; } })();
      if (v) return v;
      await sleep(iv);
    }
    return null;
  }

  function isClassicPatientPage() {
    const pid = getPatientID();
    if (!pid) return false;
    if (window.self !== window.top) return false;
    const href = String(location.href || '').toLowerCase();
    if (!href.includes('patient_infos')) return false;
    if (href.includes('popup=true')) return false;
    if (/(courrier|courier|lettre|mailing|mailbox)/i.test(href)) return false;
    if (href.includes('/prescription/editor-page/')) return false;
    if (hasBillingUI(document)) return false;
    return true;
  }

  function isPatientCRPage() {
    const pid = getPatientID();
    if (!pid) return false;
    if (window.self !== window.top) return false;
    const href = String(location.href || '').toLowerCase();
    if (href.includes('popup=true')) return false;
    if (/(courrier|courier|lettre|mailing|mailbox)/i.test(href)) return false;
    if (href.includes('/prescription/editor-page/')) return false;
    if (hasBillingUI(document)) return false;
    return hasCR();
  }

  // =========================
  // BILLING (Favoris Facturation)
  // =========================
  function getJQ(win) { return win && win.jQuery ? win.jQuery : null; }

  function hasBillingUI(doc) {
    if (!doc) return false;
    const hasTable = !!doc.querySelector('#tablelist') || !!doc.querySelector("[id*='tablelist']") || !!doc.querySelector("table[id*='list']");
    const hasNewBtn = !!doc.querySelector("button[onclick*='monecho_AddFacture']") || !!doc.querySelector("[onclick*='AddFacture']") || (typeof doc.defaultView?.monecho_AddFacture === 'function');
    const hasFactureSelect = !!doc.querySelector("[id^='select_'][id$='_chosen']") || !!doc.querySelector('.chosen-container') || !!doc.querySelector("select[id^='select_']");
    const hasRegBtn = !!doc.querySelector("button[onclick*='AddReglement']") || !!doc.querySelector("[onclick*='AddReglement']") || (typeof doc.defaultView?.monecho_AddReglement === 'function');
    return hasNewBtn && (hasTable || hasFactureSelect || hasRegBtn);
  }

  function findBillingCtxFromWindow(win) {
    try {
      const doc = win.document;
      if (hasBillingUI(doc)) return { win, doc, frame: null };
      for (const fr of Array.from(doc.querySelectorAll('iframe'))) {
        try {
          const w = fr.contentWindow;
          const d = fr.contentDocument;
          if (hasBillingUI(d)) return { win: w, doc: d, frame: fr };
        } catch (e) {}
      }
    } catch (e) {}
    return null;
  }

  async function getBillingCtx() {
    return await waitFor(() => findBillingCtxFromWindow(window), 25000, 180);
  }

  function isBillingCtxReady(ctx) {
    if (!ctx || !ctx.win || !ctx.doc) return false;
    try {
      const rs = String(ctx.doc.readyState || '').toLowerCase();
      if (rs === 'loading') return false;
      if (ctx.frame) {
        const fw = ctx.frame.ownerDocument?.defaultView || window;
        const fcs = fw.getComputedStyle(ctx.frame);
        if (fcs.display === 'none' || fcs.visibility === 'hidden' || Number(fcs.opacity) === 0) return false;
        const fr = ctx.frame.getBoundingClientRect();
        if (fr.width < 20 || fr.height < 20) return false;
        const host = ctx.frame.closest('#genericModal, .modal, .ui-dialog, [role="dialog"]');
        if (host) {
          const vw = host.ownerDocument?.defaultView || window;
          const cs = vw.getComputedStyle(host);
          if (cs.display === 'none' || cs.visibility === 'hidden') return false;
        }
      }
      const pid = String(getPatientID() || '').trim();
      if (pid) {
        const href = String((ctx.win.location && ctx.win.location.href) || ctx.doc.URL || '');
        const m = href.match(/[?&]patient_id=(\d+)/i);
        if (m && m[1] && String(m[1]) !== pid) return false;
      }
      return hasBillingUI(ctx.doc);
    } catch (e) {
      return false;
    }
  }

  function collectFactureIds(ctx) {
    const ids = new Set();
    if (!ctx || !ctx.doc) return ids;
    const els = ctx.doc.querySelectorAll("[id^='select_']");
    for (const el of els) {
      const m = String(el.id || '').match(/^select_(\d+)(?:_chosen|_.*)?$/i);
      if (m && m[1]) ids.add(String(m[1]));
    }
    return ids;
  }

  function pickNewestFactureId(ids) {
    let best = null;
    for (const id of ids || []) {
      const n = Number(id);
      if (!Number.isFinite(n)) continue;
      if (!best || n > best.n) best = { id: String(id), n };
    }
    return best ? best.id : null;
  }

  async function waitForCreatedFactureId(ctx, beforeSet, oldId) {
    const created = await waitFor(() => {
      const now = collectFactureIds(ctx);
      for (const id of now) if (!beforeSet.has(id)) return String(id);
      const cur = getFactureId(ctx);
      if (cur && cur !== oldId && !beforeSet.has(cur)) return String(cur);
      return null;
    }, 20000, 140);
    if (created) return created;
    const now = collectFactureIds(ctx);
    const newest = pickNewestFactureId(now);
    if (newest && newest !== oldId) return newest;
    return null;
  }

  async function waitBillingCtxReady(ctx, timeoutMs) {
    if (!ctx) return null;
    const to = typeof timeoutMs === 'number' ? timeoutMs : 22000;
    return await waitFor(() => (isBillingCtxReady(ctx) ? ctx : null), to, 150);
  }

  function findBillingSimpleLinkOnPatientPage(doc) {
    if (!doc) return null;
    const byOnclick = Array.from(doc.querySelectorAll('a[onclick],button[onclick]')).find((el) => {
      const oc = String(el.getAttribute('onclick') || '').toLowerCase();
      return oc.includes('compta_factures_list') && !oc.includes('stellair');
    });
    if (byOnclick) return byOnclick;
    const byId = doc.getElementById('accountmentLink');
    if (byId) return byId;
    try {
      const dd = doc.getElementById('dropdown-facturation-menu');
      const menu = dd && dd.parentElement ? dd.parentElement.querySelector('.dropdown-menu') : null;
      if (menu) {
        const a = Array.from(menu.querySelectorAll('a')).find((el) => {
          const txt = String(el.innerText || el.textContent || '').toLowerCase();
          const oc = String(el.getAttribute('onclick') || '').toLowerCase();
          const href = String(el.getAttribute('href') || '').toLowerCase();
          if (txt.includes('stellair') || oc.includes('stellair') || href.includes('stellair')) return false;
          return txt.includes('facturation') || oc.includes('compta_factures_list') || href.includes('compta_factures_list');
        });
        if (a) return a;
      }
    } catch (e) {}
    return null;
  }

  function clickNativeBillingButtonOnPatientPage() {
    const topCtx = { win: window, doc: document };
    try {
      const dd = document.getElementById('dropdown-facturation-menu');
      if (dd) clickBillingEl(topCtx, dd);
    } catch (e) {}
    const simple = findBillingSimpleLinkOnPatientPage(document);
    if (simple) {
      try { clickBillingEl(topCtx, simple); return true; } catch (e) {}
    }
    const cands = Array.from(document.querySelectorAll('a[onclick], button[onclick], a, button, input[type="button"], input[type="submit"], [role="button"]'));
    for (const el of cands) {
      const txt = String(el.innerText || el.value || el.textContent || '').trim().toLowerCase();
      const oc = String(el.getAttribute('onclick') || '').toLowerCase();
      const href = String(el.getAttribute('href') || '').toLowerCase();
      if (txt.includes('stellair') || oc.includes('stellair') || href.includes('stellair')) continue;
      if (oc.includes('compta_factures_list') || href.includes('compta_factures_list') || el.id === 'accountmentLink') {
        try { clickBillingEl(topCtx, el); return true; } catch (e) {}
      }
    }
    return false;
  }

  function openBillingSimpleFromPatientPage() {
    const pid = getPatientID();
    let opened = false;
    try {
      const topWin = (typeof unsafeWindow !== 'undefined' && unsafeWindow) ? unsafeWindow : window;
      if (pid && typeof topWin.showModalWithId === 'function') {
        topWin.showModalWithId(`/monecho?rq=compta_factures_list&patient_id=${encodeURIComponent(pid)}`, 700, 1100, 'Comptabilite', 'iframeFacturation');
        opened = true;
      } else if (pid && typeof topWin.showModal === 'function') {
        const lic = topWin.user_licence || window.user_licence || 'VASCULAR';
        topWin.showModal(`/monecho?rq=compta_factures_list&patient_id=${encodeURIComponent(pid)}&licence=${encodeURIComponent(lic)}`, 700, 1100, 'Comptabilite');
        opened = true;
      }
    } catch (e) {}
    if (opened) return true;
    return clickNativeBillingButtonOnPatientPage();
  }

  function closeBillingPopupOrPanel(ctx) {
    let changed = false;
    try {
      if (ctx && ctx.frame) {
        const host = ctx.frame.closest('#genericModal, .modal, .ui-dialog, [role="dialog"]');
        if (host) {
          const closeBtn = host.querySelector(".ui-dialog-titlebar-close, .close, [data-dismiss='modal'], button[aria-label='Close'], button[onclick*='close']");
          if (closeBtn) {
            clickBillingEl({ win: window, doc: document }, closeBtn);
            changed = true;
          }
          if (host.id === 'genericModal' && host.style.display !== 'none') {
            host.style.display = 'none';
            changed = true;
          }
        }
      }
    } catch (e) {}
    try {
      const gm = document.getElementById('genericModal');
      if (gm && gm.style.display !== 'none') {
        const closeBtn = gm.querySelector('.close, [data-dismiss="modal"], button[aria-label="Close"], button[onclick*="close"]');
        if (closeBtn) {
          clickBillingEl({ win: window, doc: document }, closeBtn);
          changed = true;
        }
        if (gm.style.display !== 'none') {
          gm.style.display = 'none';
          changed = true;
        }
      }
    } catch (e) {}
    try {
      const topWin = (typeof unsafeWindow !== 'undefined' && unsafeWindow) ? unsafeWindow : window;
      if (typeof topWin.closepopupiframe === 'function') {
        topWin.closepopupiframe();
        changed = true;
      }
    } catch (e) {}
    try {
      if (window.top && typeof window.top.closepopupiframe === 'function') {
        window.top.closepopupiframe();
        changed = true;
      }
    } catch (e) {}
    return changed;
  }

  function clickBillingEl(ctx, el) {
    if (!el) return;
    el.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
    el.dispatchEvent(new MouseEvent('mouseup', { bubbles: true }));
    el.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    const $ = getJQ(ctx.win);
    if ($) $(el).trigger('click');
  }

  function setBillingFieldValue(ctx, el, v) {
    if (!el) return;
    const proto = Object.getPrototypeOf(el);
    const desc = Object.getOwnPropertyDescriptor(proto, 'value');
    if (desc && typeof desc.set === 'function') desc.set.call(el, v);
    else el.value = v;

    el.dispatchEvent(new Event('input', { bubbles: true }));
    el.dispatchEvent(new Event('change', { bubbles: true }));

    const $ = getJQ(ctx.win);
    if ($) {
      if ((el.tagName || '').toLowerCase() === 'select') $(el).trigger('chosen:updated');
      $(el).trigger('input').trigger('change');
    }
  }

  function getFactureId(ctx) {
    const chosen = ctx.doc.querySelector("[id^='select_'][id$='_chosen']");
    if (chosen) {
      const m = chosen.id.match(/^select_(\d+)_chosen$/);
      if (m) return m[1];
    }
    const sel = ctx.doc.querySelector("select[id^='select_']");
    if (sel && sel.id) {
      const m2 = sel.id.match(/^select_(\d+)(?:_|$)/);
      if (m2) return m2[1];
    }
    return null;
  }

  function getFactureSelectEl(ctx) {
    const chosen = ctx.doc.querySelector("[id^='select_'][id$='_chosen']");
    if (chosen) {
      const selectId = chosen.id.replace(/_chosen$/, '');
      return ctx.doc.getElementById(selectId) || null;
    }
    return ctx.doc.querySelector("select[id^='select_']") || null;
  }

  function ensureFactureSelected(ctx, factureId, silent) {
    const sel = getFactureSelectEl(ctx);
    if (!sel) return false;
    const want = String(factureId);
    const hasOpt = Array.from(sel.options || []).some((o) => String(o.value) === want);
    if (!hasOpt) return false;
    if (String(sel.value) !== want) {
      if (silent) {
        sel.value = want;
        const $ = getJQ(ctx.win);
        if ($) $(sel).trigger('chosen:updated');
      } else {
        setBillingFieldValue(ctx, sel, want);
      }
      return true;
    }
    return false;
  }

  function isElementVisible(el) {
    if (!el) return false;
    const w = el.ownerDocument.defaultView;
    const cs = w.getComputedStyle(el);
    if (cs.display === 'none' || cs.visibility === 'hidden' || Number(cs.opacity) === 0) return false;
    const r = el.getBoundingClientRect();
    return r.width > 0 && r.height > 0;
  }

  function keepInvoiceDetailVisible(ctx, factureId) {
    try {
      const table = ctx.doc.querySelector('#tablelist');
      if (!table) return false;
      const visible = isElementVisible(table);
      const changed = ensureFactureSelected(ctx, factureId, true);
      if (changed || !visible) {
        const sel = getFactureSelectEl(ctx);
        if (sel) {
          const $ = getJQ(ctx.win);
          sel.dispatchEvent(new Event('change', { bubbles: true }));
          if ($) $(sel).trigger('chosen:updated').trigger('change');
        }
      }
      return changed || !visible;
    } catch (e) {
      return false;
    }
  }

  function createNewFacture(ctx) {
    if (typeof ctx.win.monecho_AddFacture === 'function' && ctx.win.document?.formulaire) {
      try { ctx.win.monecho_AddFacture(ctx.win.document.formulaire); return true; } catch (e) {}
    }
    const btn = ctx.doc.querySelector("button[onclick*='monecho_AddFacture']") || ctx.doc.querySelector("[onclick*='AddFacture']");
    if (btn) { clickBillingEl(ctx, btn); return true; }
    return false;
  }

  function collectLineIds(ctx) {
    const root = ctx.doc.querySelector('#tablelist') || ctx.doc;
    const els = root.querySelectorAll("[id^='comptaAnp_'],[id^='comptaANP_']");
    const set = new Set();
    for (const el of els) {
      const m = (el.id || '').match(/^comptaAnp_(\d+)$/i);
      if (m) set.add(m[1]);
    }
    return set;
  }

  function waitForNewLineIdFast(ctx, beforeSet, timeout) {
    const to = typeof timeout === 'number' ? timeout : 15000;
    const root = ctx.doc.querySelector('#tablelist') || ctx.doc.body || ctx.doc.documentElement;
    const findNew = () => {
      const after = collectLineIds(ctx);
      for (const x of after) if (!beforeSet.has(x)) return x;
      return null;
    };
    return new Promise((resolve) => {
      let done = false;
      let obs = null;
      let poll = null;
      let tmr = null;
      const finish = (v) => {
        if (done) return;
        done = true;
        try { obs && obs.disconnect(); } catch (e) {}
        try { poll && clearInterval(poll); } catch (e) {}
        try { tmr && clearTimeout(tmr); } catch (e) {}
        resolve(v || null);
      };
      const immediate = findNew();
      if (immediate) return finish(immediate);
      try {
        obs = new MutationObserver(() => {
          const id = findNew();
          if (id) finish(id);
        });
        obs.observe(root, { childList: true, subtree: true });
      } catch (e) {}
      poll = setInterval(() => {
        const id = findNew();
        if (id) finish(id);
      }, 120);
      tmr = setTimeout(() => finish(null), to);
    });
  }

  function resolveSelectId(tpl, fid) { return String(tpl || '').replace('{FID}', String(fid)); }

  async function chosenSelectByValue(ctx, factureId, step) {
    const selectId = resolveSelectId(step.selectTpl, factureId);
    const sel = ctx.doc.getElementById(selectId);
    if (!sel) throw new Error(`Select introuvable: #${selectId}`);
    sel.value = step.value;
    const $ = getJQ(ctx.win);
    if ($) { $(sel).trigger('chosen:updated'); $(sel).trigger('change'); }
    else sel.dispatchEvent(new Event('change', { bubbles: true }));
    await sleep(90);
  }

  function getFactureMainSelect(ctx, factureId) {
    const id = resolveSelectId('select_{FID}', factureId);
    return ctx.doc.getElementById(id) || null;
  }

  async function ensureReglementReady(ctx, factureId) {
    ensureFactureSelected(ctx, factureId, true);
    keepInvoiceDetailVisible(ctx, factureId);

    const sel0 = getFactureMainSelect(ctx, factureId);
    if (sel0 && (sel0.options || []).length > 1) return true;

    try {
      if (typeof ctx.win.monecho_AddReglement === 'function' && ctx.win.document?.formulaire) {
        ctx.win.monecho_AddReglement(ctx.win.document.formulaire);
      } else {
        const btns = Array.from(ctx.doc.querySelectorAll('button, a, input[type="button"], [role="button"]'));
        const b = btns.find((el) => {
          const t = String(el.innerText || el.value || el.textContent || '').toLowerCase();
          return t.includes('reglement') || t.includes('règlement');
        });
        if (b) clickBillingEl(ctx, b);
      }
    } catch (e) {}

    const ready = await waitFor(() => {
      const sel = getFactureMainSelect(ctx, factureId);
      return sel && (sel.options || []).length > 1 ? sel : null;
    }, 12000, 180);
    return !!ready;
  }

  function scoreField(el, kind) {
    const hay = String(`${el.id} ${el.name} ${el.className}`).toLowerCase();
    if (kind === 'tp') return ['third', 'tiers', 'tp', 'taux', 'remb', 'refund', 'payment'].reduce((s, k) => s + (hay.includes(k) ? 1 : 0), 0);
    if (kind === 'part') return ['rateflatparticipation', 'particip', 'forfait', 'pav', 'ticket', 'part'].reduce((s, k) => s + (hay.includes(k) ? 1 : 0), 0);
    return 0;
  }

  function findFieldInSameRow(ctx, lineId, kind) {
    const doc = ctx.doc;
    const anpEl = doc.getElementById(`comptaAnp_${lineId}`) || doc.getElementById(`comptaANP_${lineId}`);
    if (!anpEl) return null;
    const tr = anpEl.closest('tr');
    if (!tr) return null;
    const candidates = Array.from(tr.querySelectorAll('select,input,textarea')).filter((el) => el !== anpEl);
    let best = null;
    let bestScore = 0;
    for (const el of candidates) {
      const sc = scoreField(el, kind);
      if (sc > bestScore) { bestScore = sc; best = el; }
    }
    return best || null;
  }

  function getLineControls(ctx, lineId) {
    const doc = ctx.doc;
    const anp = doc.getElementById(`comptaAnp_${lineId}`) || doc.getElementById(`comptaANP_${lineId}`) || null;
    const tp = findFieldInSameRow(ctx, lineId, 'tp');
    const part = findFieldInSameRow(ctx, lineId, 'part');
    return { anp, tp, part };
  }

  function applyLineParamsById(ctx, lineId, params) {
    const c = getLineControls(ctx, lineId);
    if (params.anp != null && c.anp) setBillingFieldValue(ctx, c.anp, String(params.anp));
    if (params.tp != null && c.tp) setBillingFieldValue(ctx, c.tp, String(params.tp));
    if (params.part != null && c.part) setBillingFieldValue(ctx, c.part, String(params.part));
  }

  function readLineParamsById(ctx, lineId) {
    const c = getLineControls(ctx, lineId);
    const out = {};
    if (c.anp) out.anp = String(c.anp.value);
    if (c.tp) out.tp = String(c.tp.value);
    if (c.part != null) {
      const v = String(c.part.value || '').trim();
      if (v !== '') out.part = v;
    }
    return out;
  }

  function templatedSelectId(selectId, factureId) {
    const sid = String(selectId || '');
    const fid = String(factureId || '');
    if (sid.includes(fid)) return sid.replace(fid, '{FID}');
    return sid.replace(/_(\d+)(?=$|_)/, '_{FID}');
  }

  function extractLineIdFromTarget(target) {
    const id = String(target && target.id || '');
    const m1 = id.match(/^comptaAnp_(\d+)$/i);
    if (m1) return m1[1];
    const m2 = id.match(/_(\d+)(?:$|_)/);
    if (m2) return m2[1];
    return null;
  }

  function detectKindFromTarget(target) {
    const hay = String(`${target && target.id || ''} ${target && target.name || ''} ${target && target.className || ''}`).toLowerCase();
    if (hay.includes('comptaanp')) return 'anp';
    if (hay.includes('particip') || hay.includes('pav') || hay.includes('forfait') || hay.includes('ticket')) return 'part';
    if (hay.includes('third') || hay.includes('tiers') || hay.includes('remb') || hay.includes('taux') || hay.includes('payment') || hay.includes('tp')) return 'tp';
    return null;
  }

  const billingRecorder = {
    active: false,
    steps: [],
    ctx: null,
    factureId: null,
    removeFns: [],
    lineIdToStep: new Map(),

    detach() {
      this.removeFns.forEach((fn) => { try { fn(); } catch (e) {} });
      this.removeFns = [];
      this.active = false;
      this.steps = [];
      this.ctx = null;
      this.factureId = null;
      this.lineIdToStep = new Map();
    },

    async start() {
      this.detach();
      this.active = true;

      let ctx = await getBillingCtx();
      if (!ctx) {
        const opened = openBillingSimpleFromPatientPage();
        if (opened) ctx = await getBillingCtx();
      }
      ctx = await waitBillingCtxReady(ctx, 22000);
      if (!ctx) {
        this.active = false;
        alert('UI facturation introuvable.');
        return false;
      }
      this.ctx = ctx;
      this.factureId = getFactureId(ctx);
      if (!this.factureId) {
        this.active = false;
        alert('Impossible de detecter la facture active.');
        return false;
      }

      const doc = ctx.doc;
      const fid = this.factureId;

      const onMouseDown = async (ev) => {
        if (!this.active) return;
        const li = ev.target && ev.target.closest ? ev.target.closest('li.active-result') : null;
        if (!li) return;
        const chosen = ev.target && ev.target.closest ? ev.target.closest('.chosen-container') : null;
        if (!chosen || !String(chosen.id || '').endsWith('_chosen')) return;
        const selectId = String(chosen.id || '').replace(/_chosen$/, '');
        const sel = doc.getElementById(selectId);
        if (!sel) return;
        const idx = Number(li.getAttribute('data-option-array-index'));
        if (!Number.isFinite(idx)) return;
        const opt = sel.options && sel.options[idx];
        if (!opt) return;

        const value = String(opt.value);
        const selectTpl = templatedSelectId(selectId, fid);
        const stepIndex = this.steps.length;
        const beforeLines = collectLineIds(this.ctx);
        this.steps.push({ selectTpl, value, line: {} });

        const newLineId = await waitForNewLineIdFast(this.ctx, beforeLines, 15000);
        if (!newLineId) return;
        this.lineIdToStep.set(String(newLineId), stepIndex);
        const p = readLineParamsById(this.ctx, newLineId);
        this.steps[stepIndex].line = { ...(this.steps[stepIndex].line || {}), ...p };
      };

      const onChange = (ev) => {
        if (!this.active) return;
        const t = ev.target;
        const lineId = extractLineIdFromTarget(t);
        if (!lineId) return;
        const stepIndex = this.lineIdToStep.get(String(lineId));
        if (stepIndex == null) return;
        const step = this.steps[stepIndex];
        if (!step) return;
        const kind = detectKindFromTarget(t);
        if (!kind) return;
        if (!step.line) step.line = {};
        if (kind === 'anp') step.line.anp = String(t.value);
        if (kind === 'tp') step.line.tp = String(t.value);
        if (kind === 'part') step.line.part = String(t.value || '').trim();
      };

      doc.addEventListener('mousedown', onMouseDown, true);
      doc.addEventListener('change', onChange, true);
      doc.addEventListener('input', onChange, true);
      this.removeFns.push(() => doc.removeEventListener('mousedown', onMouseDown, true));
      this.removeFns.push(() => doc.removeEventListener('change', onChange, true));
      this.removeFns.push(() => doc.removeEventListener('input', onChange, true));
      return true;
    },

    async stopAndSave() {
      this.active = false;
      if (!this.steps.length) {
        alert('Aucune ligne capturee.');
        return false;
      }
      for (const [lineId, stepIndex] of this.lineIdToStep.entries()) {
        const p = readLineParamsById(this.ctx, lineId);
        this.steps[stepIndex].line = { ...(this.steps[stepIndex].line || {}), ...p };
      }
      const name = prompt('Nom du favori :', `Favori (${this.steps.length} lignes)`);
      if (!name || !String(name).trim()) return false;
      const p = profile();
      p.billingFavs.push({
        label: String(name).trim(),
        steps: this.steps.map((s) => ({
          selectTpl: s.selectTpl,
          value: s.value,
          line: {
            ...(s.line && s.line.anp != null ? { anp: String(s.line.anp) } : {}),
            ...(s.line && s.line.tp != null ? { tp: String(s.line.tp) } : {}),
            ...(s.line && s.line.part != null ? { part: String(s.line.part) } : {})
          }
        }))
      });
      saveState();
      scheduleBillingPush();
      scheduleProfilesPush();
      renderBillingFavs();
      alert('Favori facturation enregistre.');
      return true;
    }
  };

  async function runBillingFavoriteByIndex(idx, opts) {
    const o = opts || {};
    const p = profile();
    if (!Array.isArray(p.billingFavs) || !p.billingFavs[idx]) return;
    const fav = p.billingFavs[idx];

    // Fast path: test immediately, avoid waiting 25s when no billing iframe is open.
    let ctx = findBillingCtxFromWindow(window);
    ctx = await waitBillingCtxReady(ctx, 1200);
    if (!ctx) {
      const opened = openBillingSimpleFromPatientPage();
      if (opened) {
        ctx = await getBillingCtx();
        ctx = await waitBillingCtxReady(ctx, 22000);
      }
    }
    if (!ctx) return alert('UI facturation introuvable. Ouvre la facturation puis reessaie.');

    const beforeFactureIds = collectFactureIds(ctx);
    const oldId = getFactureId(ctx) || '';
    const ok = createNewFacture(ctx);
    if (!ok) return alert('Impossible de creer une nouvelle facture.');

    const newId = await waitForCreatedFactureId(ctx, beforeFactureIds, oldId);
    if (!newId) return alert('ID facture inchange.');

    await waitFor(() => {
      const t = ctx.doc.querySelector('#tablelist');
      return t && t.getBoundingClientRect().height > 0;
    }, 8000, 120);

    ensureFactureSelected(ctx, newId, true);
    keepInvoiceDetailVisible(ctx, newId);
    const regReady = await ensureReglementReady(ctx, newId);
    if (!regReady) return alert('Nouveau reglement requis avant cotation. Ouvre/regle la facture puis relance le favori.');

    for (let i = 0; i < (fav.steps || []).length; i++) {
      const step = fav.steps[i];
      ensureFactureSelected(ctx, newId, true);
      keepInvoiceDetailVisible(ctx, newId);
      const beforeLines = collectLineIds(ctx);
      await chosenSelectByValue(ctx, newId, step);
      const newLineId = await waitForNewLineIdFast(ctx, beforeLines, 15000);
      if (!newLineId) continue;
      const line = step.line || {};
      await waitFor(() => {
        const c = getLineControls(ctx, newLineId);
        const okAnp = (line.anp == null) || !!c.anp;
        const okTp = (line.tp == null) || !!c.tp;
        const okPart = (line.part == null) || !!c.part;
        return okAnp && okTp && okPart;
      }, 5000, 120);
      if (line.anp != null || line.tp != null || line.part != null) {
        applyLineParamsById(ctx, newLineId, line);
        await sleep(90);
      }
      keepInvoiceDetailVisible(ctx, newId);
      ensureFactureSelected(ctx, newId, true);
    }
    if (o.closeOnFinish) {
      await sleep(120);
      closeBillingPopupOrPanel(ctx);
    }
    return true;
  }

  async function runQuickBillingFromCR(triggerBtn) {
    if (quickBillingBusy) return;
    if (!isPatientCRPage()) return alert('Facturation rapide disponible uniquement sur page CR.');
    const p = profile();
    const favs = Array.isArray(p.billingFavs) ? p.billingFavs : [];
    if (!favs.length) return alert('Aucun favori facturation configure.');
    let idx = Number.isFinite(p.quickBillingFavIdx) ? Math.floor(p.quickBillingFavIdx) : 0;
    if (idx < 0 || idx >= favs.length) idx = 0;
    const btn = triggerBtn || document.getElementById('ime-b-bi') || document.getElementById('ime-b-bq');
    quickBillingBusy = true;
    if (btn) { btn.disabled = true; btn.style.opacity = '0.7'; }
    try {
      await runBillingFavoriteByIndex(idx, { closeOnFinish: true });
    } finally {
      quickBillingBusy = false;
      if (btn) { btn.disabled = false; btn.style.opacity = '1'; }
    }
  }

  function renderBillingFavs() {
    const wrap = document.getElementById('ime-billing-list');
    if (!wrap) return;
    const p = profile();
    const favs = Array.isArray(p.billingFavs) ? p.billingFavs : [];
    wrap.innerHTML = '';
    if (!favs.length) {
      wrap.innerHTML = '<div style="padding:8px;color:#777">Aucun favori facturation.</div>';
      return;
    }
    favs.forEach((f, idx) => {
      const row = document.createElement('div');
      row.style.display = 'grid';
      row.style.gridTemplateColumns = '1fr auto auto auto auto';
      row.style.gap = '6px';
      row.style.marginBottom = '6px';

      const run = document.createElement('button');
      run.className = 'ime-mini';
      run.textContent = `▶ ${f.label || `Favori ${idx + 1}`}`;
      run.title = 'Executer le favori';
      run.onclick = () => runBillingFavoriteByIndex(idx).catch((e) => alert(`Erreur facturation: ${e?.message || e}`));

      const ren = document.createElement('button');
      ren.className = 'ime-mini';
      ren.textContent = '✏';
      ren.title = 'Renommer';
      ren.onclick = () => {
        const n = prompt('Nouveau nom du favori :', f.label || '');
        if (!n || !String(n).trim()) return;
        favs[idx].label = String(n).trim();
        saveState();
        scheduleBillingPush();
        scheduleProfilesPush();
        renderBillingFavs();
      };

      const up = document.createElement('button');
      up.className = 'ime-mini';
      up.textContent = '↑';
      up.title = 'Monter';
      up.onclick = () => {
        if (idx <= 0) return;
        const tmp = favs[idx - 1];
        favs[idx - 1] = favs[idx];
        favs[idx] = tmp;
        saveState();
        scheduleBillingPush();
        scheduleProfilesPush();
        renderBillingFavs();
      };

      const down = document.createElement('button');
      down.className = 'ime-mini';
      down.textContent = '↓';
      down.title = 'Descendre';
      down.onclick = () => {
        if (idx >= favs.length - 1) return;
        const tmp = favs[idx + 1];
        favs[idx + 1] = favs[idx];
        favs[idx] = tmp;
        saveState();
        scheduleBillingPush();
        scheduleProfilesPush();
        renderBillingFavs();
      };

      const del = document.createElement('button');
      del.className = 'ime-mini danger';
      del.textContent = '🗑';
      del.title = 'Supprimer';
      del.onclick = () => {
        if (!confirm(`Supprimer "${f.label || `Favori ${idx + 1}`}" ?`)) return;
        favs.splice(idx, 1);
        saveState();
        scheduleBillingPush();
        scheduleProfilesPush();
        renderBillingFavs();
      };

      row.appendChild(run);
      row.appendChild(ren);
      row.appendChild(up);
      row.appendChild(down);
      row.appendChild(del);
      wrap.appendChild(row);
    });
  }

  // =========================
  // ORDONNANCES
  // =========================
  function launchPrescription(contenuHtml, autoPrint) {
    const pid = getPatientID();
    if (!pid) { alert('Aucun patient detecte.'); return; }
    const urlOrdo = `/prescription/editor-page/${pid}?licence=${unsafeWindow.user_licence || 'VASCULAR'}`;
    if (unsafeWindow.showModal) {
      unsafeWindow.showModal(urlOrdo, 590, 800, 'Ordonnance');
      if (autoPrint) waitForIframeAndFill(contenuHtml);
    } else {
      alert('showModal introuvable.');
    }
  }

  function waitForIframeAndFill(contenuHtml) {
    let attempts = 0;
    const timer = setInterval(() => {
      attempts++;
      if (attempts > 30) { clearInterval(timer); return; }
      const modal = document.getElementById('genericModal');
      if (!modal || modal.style.display === 'none') return;
      const iframe = modal.querySelector('iframe');
      if (!iframe) return;
      const iframeDoc = iframe.contentDocument || iframe.contentWindow.document;
      if (!iframeDoc || iframeDoc.readyState !== 'complete') return;
      if (iframe.contentWindow.tinymce && iframe.contentWindow.tinymce.activeEditor) {
        clearInterval(timer);
        const editor = iframe.contentWindow.tinymce.activeEditor;
        editor.setContent(contenuHtml);
        setTimeout(() => { clickPrintButton(iframeDoc); }, 450);
      }
    }, 180);
  }

  function clickPrintButton(iframeDoc) {
    const buttons = iframeDoc.querySelectorAll('.btn-primary, button, a');
    let targetBtn = null;
    for (const btn of buttons) {
      const t = (btn.innerText || '').trim();
      if (t.includes('Enregistrer et Voi') || t.includes('Imprimer')) {
        targetBtn = btn;
        break;
      }
    }
    if (targetBtn) targetBtn.click();
  }

  function renderOrdos() {
    const wrap = document.getElementById('ime-ordos-list');
    if (!wrap) return;
    const p = profile();
    const ordos = Array.isArray(p.ordos) ? p.ordos : [];
    wrap.innerHTML = '';

    const manual = document.createElement('button');
    manual.className = 'ime-mini';
    manual.style.width = '100%';
    manual.textContent = 'Ordonnance vide';
    manual.onclick = () => launchPrescription('', false);
    wrap.appendChild(manual);

    if (!ordos.length) {
      const empty = document.createElement('div');
      empty.style.color = '#777';
      empty.style.padding = '8px';
      empty.textContent = 'Aucune ordonnance.';
      wrap.appendChild(empty);
      return;
    }

    ordos.forEach((o, idx) => {
      const row = document.createElement('div');
      row.style.display = 'grid';
      row.style.gridTemplateColumns = '1fr auto auto auto auto';
      row.style.gap = '6px';
      row.style.marginTop = '6px';

      const run = document.createElement('button');
      run.className = 'ime-mini';
      run.textContent = o.title || `Ordo ${idx + 1}`;
      run.title = 'Lancer ordonnance';
      run.onclick = () => launchPrescription(String(o.html || ''), true);

      const ren = document.createElement('button');
      ren.className = 'ime-mini';
      ren.textContent = '✏';
      ren.onclick = () => {
        const n = prompt('Titre ordonnance :', o.title || '');
        if (!n || !String(n).trim()) return;
        const h = prompt('HTML ordonnance :', String(o.html || ''));
        if (h === null) return;
        ordos[idx].title = String(n).trim();
        ordos[idx].html = String(h || '');
        saveState();
        scheduleOrdosPush();
        scheduleProfilesPush();
        renderOrdos();
      };

      const up = document.createElement('button');
      up.className = 'ime-mini';
      up.textContent = '↑';
      up.onclick = () => {
        if (idx <= 0) return;
        const tmp = ordos[idx - 1];
        ordos[idx - 1] = ordos[idx];
        ordos[idx] = tmp;
        saveState();
        scheduleOrdosPush();
        scheduleProfilesPush();
        renderOrdos();
      };

      const down = document.createElement('button');
      down.className = 'ime-mini';
      down.textContent = '↓';
      down.onclick = () => {
        if (idx >= ordos.length - 1) return;
        const tmp = ordos[idx + 1];
        ordos[idx + 1] = ordos[idx];
        ordos[idx] = tmp;
        saveState();
        scheduleOrdosPush();
        scheduleProfilesPush();
        renderOrdos();
      };

      const del = document.createElement('button');
      del.className = 'ime-mini danger';
      del.textContent = '🗑';
      del.onclick = () => {
        if (!confirm(`Supprimer "${o.title || `Ordo ${idx + 1}`}" ?`)) return;
        ordos.splice(idx, 1);
        saveState();
        scheduleOrdosPush();
        scheduleProfilesPush();
        renderOrdos();
      };

      row.appendChild(run);
      row.appendChild(ren);
      row.appendChild(up);
      row.appendChild(down);
      row.appendChild(del);
      wrap.appendChild(row);
    });
  }

  let inFlight = false;
  let sttRec = null;
  let sttRunning = false;
  let sttWantRun = false;
  let sttPressed = false;
  let sttIgnoreClickUntil = 0;
  let sttStream = null;
  let sttRecorder = null;
  let sttChunks = [];
  let sttBackendBusy = false;
  let LAST_AI_HTML_RAW = '';
  let LAST_AI_QC = { critical: [], warning: [], info: [] };

  const MEDICAL_TERMS = [
    'doppler', 'artere', 'arteriel', 'arterielle', 'veine', 'veineux', 'veineuse', 'atherome', 'plaque',
    'stenose', 'occlusion', 'reflux', 'thrombose', 'tvp', 'saphene', 'varice', 'sclerose', 'laser',
    'endoveineux', 'ips', 'itb', 'carotide', 'femorale', 'poplitee', 'tibiale', 'iliaque', 'claudication',
    'ulcere', 'compressif', 'anticoagulant', 'antiagregant', 'aspirine', 'statine', 'hta', 'diabete',
    'antecedent', 'antecedents', 'allergie', 'allergies', 'traitement', 'traitements', 'contexte', 'medicament',
    'medicaments', 'tabac', 'cholesterol', 'insuffisance', 'douleur', 'dyspnee',
    'capillaroscopie', 'raynaud', 'microangiopathie', 'renale', 'renales', 'fistule', 'fav',
    'anastomose', 'anastomotique', 'ulnaire', 'radiale', 'humerale', 'cephalique', 'basilique',
    'phlebectomie', 'tumescence', 'aetoxisclerol', 'tsao', 'vertebrale', 'basilaire'
  ];

  function aiStatus(msg) {
    const e = document.getElementById('ime-ai-status');
    if (e) e.textContent = msg || '';
  }

  function aiLive(msg) {
    const e = document.getElementById('ime-ai-mic-live');
    if (e) e.textContent = msg || '';
  }

  function aiQcRender(report) {
    LAST_AI_QC = report || { critical: [], warning: [], info: [] };
    const box = document.getElementById('ime-ai-qc');
    if (!box) return;
    const lines = [];
    (LAST_AI_QC.critical || []).forEach((x) => lines.push(`<div class="ime-qc-critical">Critique: ${x}</div>`));
    (LAST_AI_QC.warning || []).forEach((x) => lines.push(`<div class="ime-qc-warning">Attention: ${x}</div>`));
    (LAST_AI_QC.info || []).forEach((x) => lines.push(`<div class="ime-qc-info">Info: ${x}</div>`));
    box.innerHTML = lines.length ? lines.join('') : '<div class="ime-qc-ok">QC: aucune alerte bloquante.</div>';
  }

  function getExamTypeLabel(v) {
    const x = String(v || '').toLowerCase();
    if (x === 'arteriel') return 'Doppler arteriel';
    if (x === 'arterio_veineux_mi') return 'Doppler arteriel + veineux des membres inferieurs';
    if (x === 'veineux') return 'Doppler veineux';
    if (x === 'tvp_urgence') return 'Urgence TVP';
    if (x === 'sclerose') return 'Sclerose';
    if (x === 'laser') return 'Laser endoveineux';
    if (x === 'fav_creation') return 'Cartographie pre-creation de FAV';
    if (x === 'fav_bilan') return 'Bilan de FAV';
    if (x === 'tsao') return 'Doppler TSAo';
    if (x === 'renales') return 'Doppler arteres renales';
    if (x === 'capillaroscopie') return 'Capillaroscopie peri-ungueale';
    if (x === 'postop') return 'Controle post-operatoire';
    return 'Vasculaire (auto)';
  }

  function getExamTypeFamily(v) {
    const x = String(v || '').toLowerCase();
    if (x === 'arteriel' || x === 'renales' || x === 'tsao') return 'arteriel';
    if (x === 'veineux' || x === 'tvp_urgence' || x === 'sclerose') return 'veineux';
    if (x === 'arterio_veineux_mi' || x === 'fav_creation' || x === 'fav_bilan') return 'mixte';
    if (x === 'laser') return 'acte';
    if (x === 'capillaroscopie') return 'microcirculation';
    return 'auto';
  }

  function inferExamTypeFromContent(html, instruction) {
    const txt = `${String(html || '')}\n${String(instruction || '')}`.toLowerCase();
    const negTVP = /(absence de tvp|pas de tvp|sans tvp|tvp absente|absence de tvs|pas de tvs|sans tvs|tvs absente|absence de thrombose|pas de thrombose|sans thrombose|thrombose absente)/.test(txt);
    const tvpMention = /(\btvp\b|\btvs\b|thrombose veineuse profonde|thrombose occlusive|phlebite)/.test(txt);
    const urgentWords = /(urgence|urgent|suspi(?:cion)?|suspecte?|aigu[e]?)/.test(txt);
    const urgentSymptoms = /(douleur.+mollet|mollet.+douleur|oedeme.+membre|membre.+oedeme|jambe.+oedeme|oedeme.+jambe)/.test(txt);
    const urgentTVPCtx = (tvpMention && urgentWords) || urgentSymptoms;
    const hardTVP = /(\btvp\b|\btvs\b|thrombose veineuse profonde|thrombose occlusive)/.test(txt);
    const veineuxSuperficielCtx = /(reflux|varice|saphene|ostial|ostio|tronculaire|pelvien|peri[- ]?uterin|vulvair|inguinal)/.test(txt);
    if (/(capillaroscop|peri[- ]?ungue|acrosyndrom|raynaud|microangiopath)/.test(txt)) return 'capillaroscopie';
    if (/(compte rendu operatoire|phlebectom|tumescence|anesthes|laser|endoveineux|rfa|radiofrequence)/.test(txt)) return 'laser';
    if (/(sclero|sclerose|echosclerose)/.test(txt)) return 'sclerose';
    if (/(fistule arterio[- ]?veineuse|f\\.?a\\.?v\\.?|\\bfav\\b)/.test(txt)) {
      if (/(creation|cartographie|allen|possibilite|radio-cephal|ulno-basil)/.test(txt)) return 'fav_creation';
      return 'fav_bilan';
    }
    if (/(arteres? renales?|reno[- ]?vascul|interlobair|arquee|nephro[- ]?angioscler)/.test(txt)) return 'renales';
    if (/(tsao|tronc[s]? supra[- ]?aort|carotide|vertebrale|sous[- ]?claviere|basilaire)/.test(txt)) return 'tsao';
    if (urgentTVPCtx) return 'tvp_urgence';
    if (hardTVP && !negTVP && !veineuxSuperficielCtx) return 'tvp_urgence';
    if (/(territoire arteriel des membres inferieurs|axes vasculaires des membres inferieurs|veines superficielles|veines profondes)/.test(txt) && /(artere|arteriel|stenose|occlusion)/.test(txt) && /(veine|veineux|varice|reflux|saphene)/.test(txt)) {
      return 'arterio_veineux_mi';
    }
    if (/(veine|veineux|varice|saphene|reflux veineux|thrombose veineuse|tvp)/.test(txt)) return 'veineux';
    if (/(artere|arteriel|atherome|stenose|occlusion|aomi|ips|itb|carotide)/.test(txt)) return 'arteriel';
    if (/(post[- ]?op|controle|suivi)/.test(txt)) return 'postop';
    return 'auto';
  }

  function buildExamSpecificPromptRules(inferredType) {
    const t = String(inferredType || '').toLowerCase();
    if (t === 'arteriel') return [
      'Arteriel: decrire les lesions par segment (iliaque, femorale, poplitee, jambiere) et par cote.',
      'Verifier la coherence hemodynamique proximo-distale: une stenose proximale significative doit retentir en aval sauf pontage/collaterales explicites.',
      'Si une stenose est decrite, preciser le degre, le retentissement de flux et le caractere significatif.'
    ];
    if (t === 'arterio_veineux_mi') return [
      'Arterio-veineux MI: separer clairement le versant arteriel et le versant veineux.',
      'Veineux: distinguer reseau profond, superficiel, reflux ostial/tronculaire et varices non systematisees.',
      'Si varices vulvaires/inguinales, reflux pelvien, varices peri-uterines ou reflux atypique des MI sans cible ostio-tronculaire claire: evoquer une origine pelvienne.',
      'En cas de suspicion d origine pelvienne, recommander IRM pelvienne et avis de radiologie interventionnelle pour discussion d embolisation.',
      'Insuffisance veineuse fonctionnelle: a retenir surtout si pas de reflux veineux pathologique objectivable sur le territoire symptomatique.',
      'Si reflux tronculaire/ostial est objectivable, conclure en priorite a une insuffisance veineuse organique; ne garder "fonctionnelle" qu en association explicite (ex: symptomes controlateraux ou composante de station debout).',
      'Ne pas affirmer l absence de syndrome de Cockett/pince aorto-mesenterique sur un Doppler standard; preferer "pas d anomalie aorto-iliaque evidente au Doppler" si necessaire.',
      'Conclusion: donner un bilan combine clair avec points normaux et pathologiques.'
    ];
    if (t === 'veineux') return [
      'Veineux: decrire reseau profond puis superficiel, par cote.',
      'Preciser thrombose (presence/absence), compressibilite et reflux ostial/tronculaire.',
      'Si varices vulvaires/inguinales, reflux pelvien, varices peri-uterines ou reflux atypique sans cible ostio-tronculaire: evoquer une origine pelvienne.',
      'Si origine pelvienne suspectee: recommander IRM pelvienne et avis radiologie interventionnelle (embolisation a discuter).',
      'Insuffisance veineuse fonctionnelle: uniquement si absence de reflux pathologique objectivable sur le territoire symptomatique.',
      'Si reflux pathologique decrit, ne pas conclure a une insuffisance veineuse fonctionnelle isolee (association possible seulement si explicitement justifiee).',
      'Ne pas conclure "absence de Cockett/pince aorto-mesenterique" sur Doppler standard; utiliser plutot "pas d anomalie aorto-iliaque evidente".'
    ];
    if (t === 'tvp_urgence') return [
      'Urgence TVP: prioriser la reponse binaire presence/absence de TVP/TVS et la lateralite.',
      'Conclusion courte, non ambigue, avec conduite immediate adaptee au contexte urgent.'
    ];
    if (t === 'sclerose') return [
      'Sclerose: conserver cartographie des reflux, acte realise (produit, concentration, volume) et resultat immediat.',
      'Ne pas proposer de geste sclerosant si le bilan conclut a une insuffisance veineuse purement fonctionnelle sans cible anatomique.',
      'Ajouter la conduite de suivi (delai de controle, recommandations post-acte).'
    ];
    if (t === 'laser') return [
      'Compte-rendu operatoire laser: conserver rubriques INDICATION et INTERVENTION.',
      'Structurer en acte, cote, geste realise, fin d intervention, et suites/recommandations.'
    ];
    if (t === 'fav_creation') return [
      'Pre-creation FAV: separer examen clinique (Allen) puis cartographie veineuse et arterielle des membres superieurs.',
      'Conclure par possibilites de montage de FAV par cote avec option principale/alternative.'
    ];
    if (t === 'fav_bilan') return [
      'Bilan FAV: decrire artere afferente, chambre anastomotique, veine efferente, vol, et parametres (IR/debit/PSV).',
      'Conclure sur fonctionnalite de la fistule et presence/absence de dysfonction.'
    ];
    if (t === 'tsao') return [
      'TSAo: structurer par territoire (carotides, vertebrales, sous-clavieres, eventuellement cerebral) et par cote.',
      'Si lesion, preciser degre de stenose et retentissement hemodynamique.'
    ];
    if (t === 'renales') return [
      'Arteres renales: decrire ostium/segment intermediaire/hile droite et gauche.',
      'Inclure elements parenchymateux utiles (IR, cortex-medullaire) et implication clinique reno-vasculaire.'
    ];
    if (t === 'capillaroscopie') return [
      'Capillaroscopie: decrire architecture, densite capillaire, dystrophies, hemorragies, stase, et interpretation globale.',
      'Conclusion sur microangiopathie specifique/non specifique et orientation therapeutique sobre.'
    ];
    return [
      'Respecter la logique clinique vasculaire, les lateralites, et la coherence lesion-flux.',
      'Prioriser un style synthetique, clair, directement exploitable.'
    ];
  }

  function buildAISystemPrompt(isModify, inferredType) {
    const examLabel = getExamTypeLabel(inferredType);
    const examFamily = getExamTypeFamily(inferredType);
    const specificRules = buildExamSpecificPromptRules(inferredType);
    const baseLines = [
      'Tu es assistant medical vasculaire expert en comptes-rendus de Doppler et actes vasculaires.',
      `Type d examen cible: ${examLabel}.`,
      `Famille clinique dominante: ${examFamily}.`,
      'Ne casse jamais la structure HTML de la trame.',
      'Ignore les paroles non medicales, le bruit de salle, et les interventions de tiers.',
      'Integre les donnees utiles dans les bonnes sections: contexte, antecedents, traitements, allergies, examen, resultats, conclusion, conduite a tenir.',
      'Les informations de contexte (motif, antecedents, allergies, traitements) sont placees en debut de compte-rendu, avant les constatations techniques.',
      'Si signes en faveur d une origine veineuse pelvienne (reflux pelvien, varices peri-uterines, varices vulvaires/inguinales, reflux atypique), l orientation doit mentionner IRM pelvienne + avis radiologie interventionnelle (embolisation a discuter).',
      'Eviter d affirmer l absence de syndrome de Cockett/pince aorto-mesenterique sur un Doppler standard; preferer une formule prudente de type "pas d anomalie aorto-iliaque evidente".',
      'En veineux: reserve le terme "insuffisance veineuse fonctionnelle" aux cas sans reflux pathologique objectivable sur le territoire symptomatique.',
      'Si reflux veineux pathologique est objectivable, conclure en priorite a une insuffisance veineuse organique (ostio/tronculaire) et ne mentionner la composante fonctionnelle qu en association explicite.',
      'Si la trame contient une section "Au total", considere-la comme la synthese finale et reecris-la completement selon les constatations.',
      'Ne cree pas de doublon "Au total" + "Conclusion" sauf obligation de la trame; une seule synthese finale coherente.',
      'Supprime/remplace les phrases heritees contradictoires (ex: "absence d insuffisance" alors qu un reflux pathologique est decrit).',
      'Ne propose pas de geste invasif (sclerose/chirurgie/endoveineux) sans cible anatomique pathologique clairement decrite.',
      'Redaction professionnelle, concise, coherente et directement exploitable.',
      'N invente pas d element non dicte; si une info manque, garde une formulation prudente.',
      'Conclusion obligatoire: separer explicitement normal vs pathologique + recommandations proportionnees.'
    ];
    if (isModify) {
      return [
        ...baseLines,
        'Tu modifies un compte-rendu HTML existant: conserve les sections/styles de la trame et corrige uniquement le fond medical.',
        'Regles specifiques pour ce type:',
        ...specificRules.map((x) => `- ${x}`),
        'Renvoie uniquement le HTML final complet.'
      ].join('\n');
    }
    return [
      'Tu deduis automatiquement le type exact d examen depuis la trame et la dictee.',
      'Tu rediges a partir d une trame HTML + dictee.',
      ...baseLines,
      'Regles specifiques pour ce type:',
      ...specificRules.map((x) => `- ${x}`),
      'Renvoie uniquement le HTML final complet.'
    ].join('\n');
  }

  function buildConclusionPatchPrompt(inferredType) {
    return [
      'Tu renforces uniquement la conclusion d un compte-rendu medical vasculaire HTML.',
      `Type detecte: ${getExamTypeLabel(inferredType)}.`,
      'Ne casse pas la structure HTML.',
      'Conserve tout le contenu existant.',
      'Si "Au total" est present, utilise cette section comme synthese finale plutot que d ajouter une section "Conclusion" supplementaire.',
      'Harmonise la synthese pour supprimer les phrases contradictoires heritees.',
      'Si les constatations suggerent une origine pelvienne (reflux pelvien/varices peri-uterines/varices vulvaires-inguinales/reflux atypique), inclure une orientation IRM pelvienne + avis radiologie interventionnelle.',
      'Ne pas affirmer "absence de syndrome de Cockett/pince aorto-mesenterique" sur Doppler standard; preferer "pas d anomalie aorto-iliaque evidente" si necessaire.',
      'En veineux, reserve "insuffisance veineuse fonctionnelle" aux cas sans reflux pathologique objectivable sur le territoire symptomatique.',
      'Si reflux pathologique est present, conclure a une insuffisance veineuse organique; composante fonctionnelle seulement si explicitement associee.',
      'Rends la conclusion explicite: normal vs pathologique + recommandations.',
      'Renvoie uniquement le HTML complet.'
    ].join('\n');
  }

  function needsSummaryHarmonization(html, examType, veinFunctionalPolicy) {
    const txt = stripTags(html).toLowerCase();
    const hasAuTotal = /\bau total\b/.test(txt);
    const hasConclusion = /\bconclusion\b/.test(txt);
    if (hasAuTotal && hasConclusion) return true;
    const fam = getExamTypeFamily(examType);
    const hasVeinContradiction = /(absence d[' ]?(?:insuffisance veineuse|reflux)\s+(?:ostio|osteo)[- ]?tronculair(?:e|es)?)/.test(txt) && /\breflux\b/.test(txt);
    const hasMixedVeinSummary = /absence d[' ]?insuffisance veineuse[^.\n]{0,180}\binsuffisance veineuse\b|\binsuffisance veineuse[^.\n]{0,180}absence d[' ]?insuffisance veineuse/.test(txt);
    const hasFunctionalTerm = /\binsuffisance veineuse fonctionnelle\b/.test(txt);
    const hasPathologicReflux = /\breflux\b[^.\n]{0,80}\b(ostio|ostial|tronculair|tronculaire|saphen|gvs|pvs|patholog|significatif|majeur)|\bincontinence\s+ostio[- ]?tronculaire\b/.test(txt);
    const hasFunctionalAssociationHint = /\bassocie(?:e|es)?\b|\bcontrolater(?:al|ale)\b|\bsur l autre membre\b|\bcomposante fonctionnelle\b/.test(txt);
    const hasFunctionalIncoherence = hasFunctionalTerm && hasPathologicReflux && !hasFunctionalAssociationHint;
    const policy = String(veinFunctionalPolicy || '').toLowerCase();
    const policyMismatch = (policy === 'non' && hasFunctionalTerm)
      || (policy === 'isolee' && hasPathologicReflux)
      || (policy === 'associee' && hasFunctionalTerm && !hasFunctionalAssociationHint);
    const pelvicRefluxPositive = /\breflux pelvien\b/.test(txt) && !/\b(absence de|sans)\s+reflux pelvien\b/.test(txt);
    const periUterinePositive = /\bvarices?\s+peri[- ]?uterin/.test(txt) && !/\b(absence de|sans)\s+varices?\s+peri[- ]?uterin/.test(txt);
    const vulvarInguinalPositive = /\bvarices?\s+(?:vulvair|inguinal)/.test(txt) && !/\b(absence de|sans)\s+varices?\s+(?:vulvair|inguinal)/.test(txt);
    const atypicalVenousPattern = /\breflux atypique\b|\breflux[^.\n]{0,60}sans[^.\n]{0,30}(ostio|troncul)/.test(txt);
    const needsPelvicOrientation = pelvicRefluxPositive || periUterinePositive || vulvarInguinalPositive || atypicalVenousPattern;
    const hasPelvicOrientation = /\birm\b[^.\n]{0,40}\bpelv|\bpelv[^.\n]{0,40}\birm\b|radiolog(?:ie)? interventionnell|embolisation/.test(txt);
    const hasCockettOverassertion = /(absence d[' ]?(?:syndrome de )?co(?:ck|qu)ett|pas de (?:syndrome de )?co(?:ck|qu)ett|absence de pince aorto[- ]?mesenterique|pas de pince aorto[- ]?mesenterique)/.test(txt);
    if ((fam === 'veineux' || examType === 'arterio_veineux_mi' || examType === 'sclerose' || examType === 'tvp_urgence') &&
      (hasVeinContradiction || hasMixedVeinSummary || hasFunctionalIncoherence || policyMismatch || (needsPelvicOrientation && !hasPelvicOrientation) || hasCockettOverassertion)) {
      return true;
    }
    return false;
  }

  function buildSummaryHarmonizePrompt(inferredType, veinFunctionalPolicy) {
    const out = [
      'Tu harmonises uniquement la synthese finale d un compte-rendu medical vasculaire HTML.',
      `Type detecte: ${getExamTypeLabel(inferredType)}.`,
      'Ne casse pas la structure HTML.',
      'Conserve le style et les sections existantes.',
      'S il existe "Au total", garde cette section comme synthese principale.',
      'Evite le doublon "Au total" + "Conclusion": une seule synthese finale coherente.',
      'Supprime les phrases de normalite contradictoires avec les constatations (ex: reflux present mais absence d insuffisance).',
      'Si signes d origine pelvienne veineuse sont presents, ajouter une orientation explicite: IRM pelvienne + avis radiologie interventionnelle (discussion embolisation).',
      'Ne pas conserver de phrase affirmant l absence de syndrome de Cockett/pince aorto-mesenterique sur Doppler standard; reformuler en "pas d anomalie aorto-iliaque evidente" si besoin.',
      'Regle veineuse: "insuffisance veineuse fonctionnelle" seulement si pas de reflux pathologique objectivable sur le territoire symptomatique.',
      'Si reflux pathologique est decrit, reformuler la synthese vers insuffisance veineuse organique; garder une composante fonctionnelle uniquement si elle est explicitement associee.'
    ];
    const policy = String(veinFunctionalPolicy || '').toLowerCase();
    if (policy === 'non') {
      out.push('Contrainte bloc: ne pas mentionner le terme "insuffisance veineuse fonctionnelle".');
    } else if (policy === 'isolee') {
      out.push('Contrainte bloc: conclure a une insuffisance veineuse fonctionnelle isolee, sans reflux pathologique cible.');
    } else if (policy === 'associee') {
      out.push('Contrainte bloc: si mention de composante fonctionnelle, l ecrire explicitement comme "associee" et non isolee.');
    }
    out.push('Renvoie uniquement le HTML complet.');
    return out.join('\n');
  }

  function forceSalutationInHtml(html, salu) {
    const s = String(salu || '').trim();
    if (!s) return String(html || '');
    let out = String(html || '');
    const re = /(Cher(?:e)?\s+(?:Confr[eè]re|confr[eè]re|Cons[œo]eur|cons[œo]eur)\s*,?)/i;
    if (re.test(out)) return out.replace(re, s);
    return `<p>${s}</p>\n${out}`;
  }

  function parseDictPairs(raw) {
    return String(raw || '')
      .split('\n')
      .map((x) => x.trim())
      .filter(Boolean)
      .map((line) => {
        const idx = line.indexOf('=');
        if (idx <= 0) return null;
        const from = line.slice(0, idx).trim();
        const to = line.slice(idx + 1).trim();
        if (!from || !to) return null;
        return { from, to };
      })
      .filter(Boolean);
  }

  function applyPersonalDictionary(txt, dictPairs) {
    let out = String(txt || '');
    (Array.isArray(dictPairs) ? dictPairs : []).forEach((r) => {
      try {
        const re = new RegExp(`\\b${escRe(r.from)}\\b`, 'gi');
        out = out.replace(re, r.to);
      } catch (e) {}
    });
    return out;
  }

  function highlightUncertaintyHtml(html) {
    let out = String(html || '');
    const marks = [
      'possible', 'probable', 'probablement', 'evocateur', 'suspect', 'semble', 'suggere',
      'a confirmer', 'non elimine', 'reserve', 'incertain'
    ];
    marks.forEach((k) => {
      try {
        const re = new RegExp(`\\b(${escRe(k)})\\b`, 'gi');
        out = out.replace(re, '<mark class="ime-uncertain">$1</mark>');
      } catch (e) {}
    });
    return out;
  }

  function stripTags(s) {
    return String(s || '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
  }

  function buildClinicalQC(html, examType, veinFunctionalPolicy) {
    const txt = stripTags(html).toLowerCase();
    const family = getExamTypeFamily(examType);
    const qc = { critical: [], warning: [], info: [] };
    if (!/\b(conclusion|au total)\b/.test(txt)) qc.critical.push('Section de synthese finale absente (Conclusion/Au total).');
    if (/\bau total\b/.test(txt) && /\bconclusion\b/.test(txt)) {
      qc.warning.push('Doublon de synthese finale detecte (Au total + Conclusion).');
    }
    if (/\bpas de stenose\b/.test(txt) && /\bstenose\b/.test(txt) && /(serree|significative|%|occlusion)/.test(txt)) {
      qc.warning.push('Possibile contradiction sur stenose (absente vs significative).');
    }
    if (/\bpas de thrombose\b/.test(txt) && /\bthrombose\b/.test(txt) && /(profonde|tvp|occlusive)/.test(txt)) {
      qc.warning.push('Possibile contradiction sur thrombose.');
    }
    const hasVeinContradiction = /(absence d[' ]?(?:insuffisance veineuse|reflux)\s+(?:ostio|osteo)[- ]?tronculair(?:e|es)?)/.test(txt) && /\breflux\b/.test(txt);
    const hasMixedVeinSummary = /absence d[' ]?insuffisance veineuse[^.\n]{0,180}\binsuffisance veineuse\b|\binsuffisance veineuse[^.\n]{0,180}absence d[' ]?insuffisance veineuse/.test(txt);
    const hasFunctionalTerm = /\binsuffisance veineuse fonctionnelle\b/.test(txt);
    const hasPathologicReflux = /\breflux\b[^.\n]{0,80}\b(ostio|ostial|tronculair|tronculaire|saphen|gvs|pvs|patholog|significatif|majeur)|\bincontinence\s+ostio[- ]?tronculaire\b/.test(txt);
    const hasFunctionalAssociationHint = /\bassocie(?:e|es)?\b|\bcontrolater(?:al|ale)\b|\bsur l autre membre\b|\bcomposante fonctionnelle\b/.test(txt);
    const policy = String(veinFunctionalPolicy || '').toLowerCase();
    const pelvicRefluxPositive = /\breflux pelvien\b/.test(txt) && !/\b(absence de|sans)\s+reflux pelvien\b/.test(txt);
    const periUterinePositive = /\bvarices?\s+peri[- ]?uterin/.test(txt) && !/\b(absence de|sans)\s+varices?\s+peri[- ]?uterin/.test(txt);
    const vulvarInguinalPositive = /\bvarices?\s+(?:vulvair|inguinal)/.test(txt) && !/\b(absence de|sans)\s+varices?\s+(?:vulvair|inguinal)/.test(txt);
    const atypicalVenousPattern = /\breflux atypique\b|\breflux[^.\n]{0,60}sans[^.\n]{0,30}(ostio|troncul)/.test(txt);
    const needsPelvicOrientation = pelvicRefluxPositive || periUterinePositive || vulvarInguinalPositive || atypicalVenousPattern;
    const hasPelvicOrientation = /\birm\b[^.\n]{0,40}\bpelv|\bpelv[^.\n]{0,40}\birm\b|radiolog(?:ie)? interventionnell|embolisation/.test(txt);
    const hasCockettOverassertion = /(absence d[' ]?(?:syndrome de )?co(?:ck|qu)ett|pas de (?:syndrome de )?co(?:ck|qu)ett|absence de pince aorto[- ]?mesenterique|pas de pince aorto[- ]?mesenterique)/.test(txt);
    if ((family === 'veineux' || examType === 'arterio_veineux_mi' || examType === 'sclerose') &&
      (hasVeinContradiction || hasMixedVeinSummary)) {
      qc.warning.push('Contradiction veineuse: reflux decrit avec phrase d absence d insuffisance ostio-tronculaire.');
    }
    if ((family === 'veineux' || examType === 'arterio_veineux_mi' || examType === 'sclerose') &&
      hasFunctionalTerm && hasPathologicReflux && !hasFunctionalAssociationHint) {
      qc.warning.push('Incoherence: insuffisance veineuse fonctionnelle mentionnee malgre reflux pathologique sans justification associee.');
    }
    if (policy === 'non' && hasFunctionalTerm) {
      qc.warning.push('Contrainte bloc non respectee: "insuffisance veineuse fonctionnelle" a ete mentionnee alors que option=Non.');
    }
    if (policy === 'isolee' && hasPathologicReflux) {
      qc.warning.push('Contrainte bloc non respectee: option "fonctionnelle isolee" incompatible avec reflux pathologique decrit.');
    }
    if (policy === 'associee' && hasFunctionalTerm && !hasFunctionalAssociationHint) {
      qc.warning.push('Contrainte bloc non respectee: composante fonctionnelle attendue comme associee, pas explicitee.');
    }
    if ((family === 'veineux' || examType === 'arterio_veineux_mi' || examType === 'sclerose') &&
      needsPelvicOrientation && !hasPelvicOrientation) {
      qc.warning.push('Suspicion d origine pelvienne sans orientation explicite (IRM pelvienne + avis radiologie interventionnelle/embolisation).');
    }
    if ((family === 'veineux' || examType === 'arterio_veineux_mi' || examType === 'sclerose') &&
      hasCockettOverassertion) {
      qc.warning.push('Formulation trop affirmative sur Cockett/pince aorto-mesenterique au Doppler standard: preferer une formule prudente (anomalie aorto-iliaque evidente).');
    }
    if ((family === 'arteriel' || examType === 'arterio_veineux_mi') && !/\b(ips|itb|index cheville bras)\b/.test(txt)) {
      qc.info.push('Type arteriel detecte: verifier si IPS/ITB doit etre mentionne.');
    }
    if ((family === 'veineux' || examType === 'arterio_veineux_mi' || examType === 'fav_creation' || examType === 'fav_bilan') && !/\b(reflux|thrombose|compressibilit)\b/.test(txt)) {
      qc.info.push('Type veineux detecte: verifier reflux/compressibilite/thrombose.');
    }
    if (examType === 'fav_creation' && !/\b(allen|radiale|ulnaire|cephalique|basilique|diametre)\b/.test(txt)) {
      qc.warning.push('Creation FAV: verifier Allen + diametres/profondeur veines et arteres.');
    }
    if (examType === 'fav_bilan' && !/\b(artere afferente|anastomotique|veine efferente|debit|ir)\b/.test(txt)) {
      qc.warning.push('Bilan FAV: verifier sections afferente/anastomose/efferente et parametres.');
    }
    if (examType === 'laser' && !/\b(indication|intervention)\b/.test(txt)) {
      qc.warning.push('Laser operatoire: verifier rubriques INDICATION et INTERVENTION.');
    }
    if (!/\b(antecedent|allerg|traitement)\b/.test(txt)) {
      qc.info.push('Contexte clinique (antecedents/allergies/traitements) non detecte explicitement.');
    }
    return qc;
  }

  function normalizeOpenAILanguage(lang) {
    const raw = String(lang || '').trim().toLowerCase().replace('_', '-');
    if (!raw) return '';
    if (/^[a-z]{2}$/.test(raw)) return raw;
    const m = raw.match(/^([a-z]{2})-[a-z0-9]{2,}$/);
    return m ? m[1] : '';
  }

  function parseOpenAIErrorText(respText, status) {
    try {
      const j = JSON.parse(String(respText || '{}'));
      const err = j && j.error ? j.error : null;
      if (!err) return `HTTP ${status}`;
      const parts = [];
      if (err.code) parts.push(String(err.code));
      if (err.param) parts.push(`param=${String(err.param)}`);
      if (err.message) parts.push(String(err.message));
      return parts.length ? `HTTP ${status} - ${parts.join(' | ')}` : `HTTP ${status}`;
    } catch (e) {
      const t = String(respText || '').trim().slice(0, 220);
      return t ? `HTTP ${status} - ${t}` : `HTTP ${status}`;
    }
  }

  function isRetryableTranscriptionConfigError(msg) {
    const m = String(msg || '').toLowerCase();
    return /(model|language|unsupported|not found|does not exist|invalid|http 400|http 404|http 422)/.test(m);
  }

  function transcribeWithOpenAIOnce(blob, key, model, language) {
    const form = new FormData();
    form.append('file', blob, 'dictation.webm');
    form.append('model', model);
    if (language) form.append('language', language);
    form.append('temperature', '0');
    return new Promise((resolve, reject) => {
      GM_xmlhttpRequest({
        method: 'POST',
        url: OPENAI_AUDIO_ENDPOINT,
        headers: { Authorization: `Bearer ${key}` },
        data: form,
        onload: (r) => {
          try {
            if (r.status < 200 || r.status >= 300) {
              return reject(new Error(parseOpenAIErrorText(r.responseText, r.status)));
            }
            const j = JSON.parse(r.responseText || '{}');
            const text = String(j.text || '').trim();
            if (!text) return reject(new Error('Transcription vide.'));
            resolve(text);
          } catch (e) {
            reject(e);
          }
        },
        onerror: () => reject(new Error('Erreur reseau transcription')),
        ontimeout: () => reject(new Error('Timeout transcription')),
        timeout: 45000
      });
    });
  }

  async function transcribeWithOpenAI(blob, lang) {
    const p = profile();
    if (!p.key) throw new Error('Aucune cle OpenAI pour transcription.');

    const wantedModel = String(p.sttModel || DEFAULT_STT_MODEL || '').trim() || DEFAULT_STT_MODEL;
    const modelCandidates = Array.from(new Set([wantedModel, DEFAULT_STT_MODEL, 'whisper-1'].filter(Boolean)));
    const normLang = normalizeOpenAILanguage(lang || p.sttLang || DEFAULT_STT_LANG);
    const langCandidates = Array.from(new Set([normLang, '']));
    let lastErr = null;

    for (const model of modelCandidates) {
      for (const lg of langCandidates) {
        try {
          const text = await transcribeWithOpenAIOnce(blob, p.key, model, lg);
          if (model !== wantedModel) {
            p.sttModel = model;
            saveState();
            scheduleProfilesPush();
          }
          return text;
        } catch (e) {
          lastErr = e;
          if (!isRetryableTranscriptionConfigError(e && e.message)) throw e;
        }
      }
    }
    throw lastErr || new Error('Echec transcription OpenAI.');
  }

  function isMedicalLikeSegment(seg) {
    const s = String(seg || '').trim();
    if (!s) return false;
    const low = s.toLowerCase();
    if (/\b(ips|itb|tvp|aomi|hta|avc|vsm|vsp)\b/i.test(low)) return true;
    if (/\b\d+(?:[.,]\d+)?\s?(mm|cm|%|mmhg|ml|min|mg|g\/l|mg\/l)\b/i.test(low)) return true;
    for (const t of MEDICAL_TERMS) {
      if (low.includes(t)) return true;
    }
    return false;
  }

  function sanitizeDictationChunk(txt, strictMedical) {
    let s = String(txt || '').replace(/[ \t]+/g, ' ').replace(/\u00a0/g, ' ').trim();
    if (!s) return '';
    s = s
      .replace(/\b(euh+|heu+|hum+|bah+|voila+|ok+|okay+|daccord|d'accord)\b/gi, ' ')
      .replace(/\s{2,}/g, ' ')
      .trim();
    if (!strictMedical) return s;

    const parts = s.split(/\n+|[.!?;:]+(?:\s+|$)/).map((x) => x.trim()).filter(Boolean);
    const kept = parts.filter((x) => isMedicalLikeSegment(x));
    if (kept.length) return kept.join('\n');
    return isMedicalLikeSegment(s) ? s : '';
  }

  function appendInstructionText(txt) {
    const ins = document.getElementById('ime-ai-instruction');
    if (!ins) return;
    const chunk = String(txt || '').trim();
    if (!chunk) return;
    const cur = String(ins.value || '').trim();
    ins.value = cur ? `${cur}\n${chunk}` : chunk;
    ins.dispatchEvent(new Event('input', { bubbles: true }));
    ins.dispatchEvent(new Event('change', { bubbles: true }));
  }

  const VEINOUS_FUNCTIONAL_OPTIONS = ['Non', 'Associee (avec reflux)', 'Isolee (sans reflux pathologique)'];
  const PELVIC_VARICES_OPTIONS = ['Non', 'Presentes', 'Suspectes'];

  const AI_BLOCK_SCHEMAS = {
    auto: {
      label: 'Auto (sans blocs)',
      examType: 'auto',
      help: 'Mode libre: la generation se base surtout sur la trame et la dictee.',
      fields: []
    },
    arteriel_complet: {
      label: 'Arteriel complet',
      examType: 'arteriel',
      help: 'Pour CR arteriel complet: TSAo, abdomen et membres inferieurs.',
      fields: [
        { id: 'motif', label: 'Motif', type: 'text', placeholder: 'ex: bilan arteriel complet / claudication' },
        { id: 'tsao', label: 'TSAo', type: 'text', placeholder: 'ex: carotides sans stenose significative' },
        { id: 'abdomen_aorte', label: 'Aorte/iliaques/viscerales', type: 'text', placeholder: 'ex: aorte libre, pas de stenose renale proximale' },
        { id: 'mi_droit', label: 'Arteriel MI droit', type: 'text', placeholder: 'ex: stenose femorale superficielle 70%' },
        { id: 'mi_gauche', label: 'Arteriel MI gauche', type: 'text', placeholder: 'ex: axes libres' },
        { id: 'flux_distal', label: 'Flux distal global', type: 'select', options: ['Normal', 'Amorti', 'Monophasique', 'Absent'] },
        { id: 'ips_droit', label: 'IPS/ITB droit', type: 'text', placeholder: 'ex: 0.68' },
        { id: 'ips_gauche', label: 'IPS/ITB gauche', type: 'text', placeholder: 'ex: 0.92' },
        { id: 'conclusion_bloc', label: 'Conclusion cible', type: 'textarea', placeholder: 'points normaux/pathologiques + plan' }
      ]
    },
    arteriel_mi: {
      label: 'Arteriel MI',
      examType: 'arteriel',
      help: 'Blocs utiles pour stenose/occlusion, retentissement de flux et IPS.',
      fields: [
        { id: 'lateralite', label: 'Lateralite', type: 'select', options: ['Bilateral', 'Droite', 'Gauche'] },
        { id: 'segments', label: 'Segments atteints', type: 'text', placeholder: 'ex: femorale superficielle droite + poplitee' },
        { id: 'lesion', label: 'Type de lesion', type: 'select', options: ['Aucune lesion', 'Plaque non stenosante', 'Stenose', 'Occlusion'] },
        { id: 'degre_stenose', label: 'Degre de stenose (%)', type: 'text', placeholder: 'ex: 70-80%' },
        { id: 'flux_aval', label: 'Flux distal', type: 'select', options: ['Normal', 'Amorti', 'Monophasique', 'Absent'] },
        { id: 'ips_droit', label: 'IPS/ITB droit', type: 'text', placeholder: 'ex: 0.62' },
        { id: 'ips_gauche', label: 'IPS/ITB gauche', type: 'text', placeholder: 'ex: 0.88' },
        { id: 'pontage_collaterales', label: 'Pontage/collaterales', type: 'select', options: ['Non', 'Oui', 'Inconnu'] },
        { id: 'notes', label: 'Notes cliniques', type: 'textarea', placeholder: 'elements a integrer dans interpretation/conclusion' }
      ]
    },
    arterio_veineux_complet: {
      label: 'Arteriel + veineux complet',
      examType: 'arterio_veineux_mi',
      help: 'Pour bilan combine arteriel + veineux (complet), avec orientation pelvienne si signes evocateurs.',
      fields: [
        { id: 'motif', label: 'Motif', type: 'text', placeholder: 'ex: bilan arterio-veineux complet' },
        { id: 'tsao_arteriel', label: 'TSAo/TAAo arteriel', type: 'text', placeholder: 'ex: carotides et vertebrales sans stenose significative' },
        { id: 'abdomen_arteriel', label: 'Abdomen arteriel', type: 'text', placeholder: 'ex: aorte/iliaques/viscerales libres' },
        { id: 'mi_arteriel', label: 'Arteriel membres inferieurs', type: 'text', placeholder: 'ex: axes arteriels MI libres' },
        { id: 'veineux_profond', label: 'Veineux profond MI', type: 'text', placeholder: 'ex: pas de TVP bilaterale' },
        { id: 'veineux_superficiel', label: 'Veineux superficiel MI', type: 'text', placeholder: 'ex: pas de reflux tronculaire GVS/PVS' },
        { id: 'varices_peri_uterines', label: 'Varices peri-uterines', type: 'select', options: PELVIC_VARICES_OPTIONS },
        { id: 'varices_vulvaires_inguinales', label: 'Varices vulvaires/inguinales', type: 'select', options: PELVIC_VARICES_OPTIONS },
        { id: 'insuffisance_fonctionnelle', label: 'Insuffisance veineuse fonctionnelle', type: 'select', options: VEINOUS_FUNCTIONAL_OPTIONS },
        { id: 'veineux_cou', label: 'Veineux du cou', type: 'text', placeholder: 'ex: jugulaires et sous-clavieres veineuses libres' },
        { id: 'reflux_pelvien', label: 'Reflux pelvien', type: 'select', options: ['Absent', 'Present', 'Suspecte', 'Non evalue'] },
        { id: 'synthese', label: 'Synthese cible', type: 'textarea', placeholder: 'normal/anormal + conduite' }
      ]
    },
    arterio_veineux_mi: {
      label: 'Arteriel + veineux MI',
      examType: 'arterio_veineux_mi',
      help: 'Pour examen combine arteriel et veineux des membres inferieurs, avec piste d origine pelvienne si besoin.',
      fields: [
        { id: 'lateralite', label: 'Lateralite', type: 'select', options: ['Bilateral', 'Droite', 'Gauche'] },
        { id: 'arteriel', label: 'Volet arteriel', type: 'textarea', placeholder: 'lesions segmentaires, degre, flux distal' },
        { id: 'veineux_profond', label: 'Veineux profond', type: 'text', placeholder: 'ex: pas de thrombose' },
        { id: 'veineux_superficiel', label: 'Veineux superficiel', type: 'text', placeholder: 'ex: reflux GVS droite' },
        { id: 'varices_peri_uterines', label: 'Varices peri-uterines', type: 'select', options: PELVIC_VARICES_OPTIONS },
        { id: 'varices_vulvaires_inguinales', label: 'Varices vulvaires/inguinales', type: 'select', options: PELVIC_VARICES_OPTIONS },
        { id: 'insuffisance_fonctionnelle', label: 'Insuffisance veineuse fonctionnelle', type: 'select', options: VEINOUS_FUNCTIONAL_OPTIONS },
        { id: 'varices', label: 'Varices non systematisees', type: 'select', options: ['Non', 'Oui'] },
        { id: 'ips_droit', label: 'IPS/ITB droit', type: 'text', placeholder: 'ex: 0.75' },
        { id: 'ips_gauche', label: 'IPS/ITB gauche', type: 'text', placeholder: 'ex: 0.91' },
        { id: 'conduite', label: 'Conduite a tenir', type: 'text', placeholder: 'ex: traitement + controle 6 mois' }
      ]
    },
    veineux_superficiel: {
      label: 'Veineux superficiel',
      examType: 'veineux',
      help: 'Blocs utiles pour reflux, TVP/TVS, reseau superficiel/pelvien, composante fonctionnelle et orientation pelvienne.',
      fields: [
        { id: 'lateralite', label: 'Lateralite', type: 'select', options: ['Bilateral', 'Droite', 'Gauche'] },
        { id: 'tvp', label: 'TVP', type: 'select', options: ['Absente', 'Presente', 'Suspectee'] },
        { id: 'tvs', label: 'TVS', type: 'select', options: ['Absente', 'Presente', 'Suspectee'] },
        { id: 'reflux_gvs', label: 'Reflux GVS', type: 'select', options: ['Absent', 'Droit', 'Gauche', 'Bilateral'] },
        { id: 'reflux_pvs', label: 'Reflux PVS', type: 'select', options: ['Absent', 'Droit', 'Gauche', 'Bilateral'] },
        { id: 'varices_peri_uterines', label: 'Varices peri-uterines', type: 'select', options: PELVIC_VARICES_OPTIONS },
        { id: 'varices_vulvaires_inguinales', label: 'Varices vulvaires/inguinales', type: 'select', options: PELVIC_VARICES_OPTIONS },
        { id: 'insuffisance_fonctionnelle', label: 'Insuffisance veineuse fonctionnelle', type: 'select', options: VEINOUS_FUNCTIONAL_OPTIONS },
        { id: 'varices_ns', label: 'Varices non systematisees', type: 'select', options: ['Non', 'Oui'] },
        { id: 'reflux_pelvien', label: 'Reflux pelvien', type: 'select', options: ['Absent', 'Present', 'Suspecte'] },
        { id: 'notes', label: 'Notes cliniques', type: 'textarea', placeholder: 'reflux, cartographie, plan therapeutique' }
      ]
    },
    tsao: {
      label: 'TSAo',
      examType: 'tsao',
      help: 'Pour Doppler des troncs supra-aortiques et axes cervico-cerebraux.',
      fields: [
        { id: 'carotide_droite', label: 'Carotide droite', type: 'text', placeholder: 'ex: normale / stenose ICA 50-69%' },
        { id: 'carotide_gauche', label: 'Carotide gauche', type: 'text', placeholder: 'ex: normale' },
        { id: 'vertebrales', label: 'Arteres vertebrales', type: 'text', placeholder: 'ex: flux normaux et symetriques' },
        { id: 'sous_clavieres', label: 'Sous-clavieres', type: 'text', placeholder: 'ex: libres' },
        { id: 'axes_intracraniens', label: 'Axes intracraniens', type: 'text', placeholder: 'ex: ACM/ACP/tronc basilaire normaux' },
        { id: 'conclusion_bloc', label: 'Conclusion cible', type: 'textarea', placeholder: 'integrite TSAo ou lesions + conduite' }
      ]
    },
    renales: {
      label: 'Arteres renales',
      examType: 'renales',
      help: 'Pour bilan reno-vasculaire (ostium/intermediaire/hile + IR).',
      fields: [
        { id: 'contexte', label: 'Contexte', type: 'text', placeholder: 'ex: suspicion HTA reno-vasculaire' },
        { id: 'renale_droite', label: 'Artere renale droite', type: 'text', placeholder: 'ex: hemodynamique normale' },
        { id: 'renale_gauche', label: 'Artere renale gauche', type: 'text', placeholder: 'ex: pas de stenose significative' },
        { id: 'ir_droit', label: 'IR droit', type: 'text', placeholder: 'ex: 0.70' },
        { id: 'ir_gauche', label: 'IR gauche', type: 'text', placeholder: 'ex: 0.69' },
        { id: 'parenchyme', label: 'Parenchyme renal', type: 'text', placeholder: 'ex: differenciation cortico-medullaire conservee' },
        { id: 'conclusion_bloc', label: 'Conclusion cible', type: 'textarea', placeholder: 'stenose renale oui/non + implication clinique' }
      ]
    },
    capillaroscopie: {
      label: 'Capillaroscopie',
      examType: 'capillaroscopie',
      help: 'Pour bilan Raynaud/acrosyndrome et signes de microangiopathie.',
      fields: [
        { id: 'visibilite', label: 'Visibilite', type: 'select', options: ['Correcte', 'Moyenne', 'Limitee'] },
        { id: 'architecture', label: 'Architecture capillaire', type: 'select', options: ['Conservee', 'Alteree'] },
        { id: 'densite', label: 'Densite capillaire', type: 'select', options: ['Normale', 'Diminuee', 'Augmentee'] },
        { id: 'dystrophies', label: 'Dystrophies', type: 'text', placeholder: 'ex: pas de dystrophies majeures' },
        { id: 'hemorragies_oedeme', label: 'Hemorragies/oedeme peri-capillaire', type: 'select', options: ['Absent', 'Present'] },
        { id: 'stase_veinulo', label: 'Stase veinulo-capillaire', type: 'select', options: ['Absente', 'Presente'] },
        { id: 'microangiopathie', label: 'Microangiopathie specifique', type: 'select', options: ['Non', 'Oui', 'Doute'] },
        { id: 'conduite', label: 'Conduite therapeutique', type: 'textarea', placeholder: 'ex: protection froid +/- inhibiteur calcique' }
      ]
    },
    urgence_tvp: {
      label: 'Urgence TVP',
      examType: 'tvp_urgence',
      help: 'Blocs courts pour conclusion urgente binaire et conduite immediate.',
      fields: [
        { id: 'cote_symptomatique', label: 'Cote symptomatique', type: 'select', options: ['Droite', 'Gauche', 'Bilateral'] },
        { id: 'tvp', label: 'TVP', type: 'select', options: ['Absente', 'Presente', 'Suspectee'] },
        { id: 'tvs', label: 'TVS', type: 'select', options: ['Absente', 'Presente', 'Suspectee'] },
        { id: 'extension', label: 'Extension', type: 'text', placeholder: 'ex: femoro-poplitee / jambiere' },
        { id: 'anticoagulation', label: 'Anticoagulation en cours', type: 'select', options: ['Non', 'Oui'] },
        { id: 'conduite', label: 'Conduite a tenir', type: 'text', placeholder: 'ex: anticoagulation + controle 7 jours' }
      ]
    },
    sclerose: {
      label: 'Sclerose',
      examType: 'sclerose',
      help: 'Pour echosclerotherapie: cartographie reflux + details de l acte.',
      fields: [
        { id: 'cote', label: 'Cote traite', type: 'select', options: ['Droite', 'Gauche', 'Bilateral'] },
        { id: 'cartographie', label: 'Cartographie reflux', type: 'textarea', placeholder: 'ex: reflux GVS droite, pas de reflux pelvien' },
        { id: 'occlusions', label: 'Occlusions post-acte', type: 'text', placeholder: 'ex: occlusion tronc principal obtenue' },
        { id: 'produit', label: 'Produit', type: 'text', placeholder: 'ex: Aetoxisclerol' },
        { id: 'concentration', label: 'Concentration (%)', type: 'text', placeholder: 'ex: 1%' },
        { id: 'volume_ml', label: 'Volume (ml)', type: 'text', placeholder: 'ex: 4 ml' },
        { id: 'resultat_immediat', label: 'Resultat immediat', type: 'text', placeholder: 'ex: spasme obtenu' },
        { id: 'controle', label: 'Controle', type: 'text', placeholder: 'ex: controle dans 1 mois' }
      ]
    },
    laser_operatoire: {
      label: 'Laser operatoire',
      examType: 'laser',
      help: 'Pour CR operatoire laser endoveineux/phlebectomies.',
      fields: [
        { id: 'date_intervention', label: 'Date intervention', type: 'text', placeholder: 'ex: 16/02/2026' },
        { id: 'cote', label: 'Cote opere', type: 'select', options: ['Droite', 'Gauche', 'Bilateral'] },
        { id: 'indication', label: 'Indication', type: 'textarea', placeholder: 'ex: incontinence ostio-tronculaire saphenienne' },
        { id: 'anesthesie', label: 'Anesthesie', type: 'text', placeholder: 'ex: LR par tumescence' },
        { id: 'geste', label: 'Geste realise', type: 'textarea', placeholder: 'ex: traitement thermique GVS + phlebectomies' },
        { id: 'incidents', label: 'Incidents', type: 'select', options: ['Aucun', 'Oui'] },
        { id: 'suites', label: 'Suites/recommandations', type: 'text', placeholder: 'ex: pansement elasto-compressif, marche precoce' }
      ]
    },
    fav_creation: {
      label: 'Creation FAV',
      examType: 'fav_creation',
      help: 'Blocs pour Allen + cartographie arterio-veineuse et options de montage.',
      fields: [
        { id: 'allen_droit', label: 'Allen droit', type: 'select', options: ['Normal', 'Pathologique', 'Non fait'] },
        { id: 'allen_gauche', label: 'Allen gauche', type: 'select', options: ['Normal', 'Pathologique', 'Non fait'] },
        { id: 'veines_droites', label: 'Veines droites utilisables', type: 'text', placeholder: 'ex: cephalique bras OK; basilique AVB < 3 mm' },
        { id: 'veines_gauches', label: 'Veines gauches utilisables', type: 'text', placeholder: 'ex: cephalique/basilique bras OK' },
        { id: 'arteres_droites', label: 'Arteres droites', type: 'text', placeholder: 'ex: radiale 2.5 mm, ulnaire 2.1 mm' },
        { id: 'arteres_gauches', label: 'Arteres gauches', type: 'text', placeholder: 'ex: flux triphasiques conserves' },
        { id: 'option_droite', label: 'Option FAV droite', type: 'text', placeholder: 'ex: radio-cephalique prioritaire' },
        { id: 'option_gauche', label: 'Option FAV gauche', type: 'text', placeholder: 'ex: humero-cephalique' },
        { id: 'notes', label: 'Notes cliniques', type: 'textarea', placeholder: 'elements techniques ou restrictions' }
      ]
    },
    fav_bilan: {
      label: 'Bilan FAV',
      examType: 'fav_bilan',
      help: 'Blocs pour debit/IR/PSV, etat de l anastomose et dysfonction.',
      fields: [
        { id: 'lateralite', label: 'Cote FAV', type: 'select', options: ['Droite', 'Gauche'] },
        { id: 'artere_afferente', label: 'Artere afferente', type: 'text', placeholder: 'ex: stenose moderee proximale' },
        { id: 'chambre_anastomotique', label: 'Chambre anastomotique', type: 'text', placeholder: 'ex: permeable / stenose anastomotique' },
        { id: 'veine_efferente', label: 'Veine efferente', type: 'text', placeholder: 'ex: bonne maturite / stenose' },
        { id: 'debit_ml_min', label: 'Debit (ml/min)', type: 'text', placeholder: 'ex: 780' },
        { id: 'ir', label: 'IR', type: 'text', placeholder: 'ex: 0.55' },
        { id: 'psv_veineux', label: 'PSV veineux', type: 'text', placeholder: 'ex: 220 cm/s' },
        { id: 'vol', label: 'Vol arteriel', type: 'select', options: ['Non', 'Oui', 'Suspect'] },
        { id: 'conclusion_bloc', label: 'Conclusion fonctionnelle', type: 'text', placeholder: 'ex: pas de dysfonction significative' }
      ]
    }
  };

  function clampAIMode(v) {
    const x = String(v || '').toLowerCase();
    if (x === 'dictee' || x === 'blocs' || x === 'hybride') return x;
    return 'hybride';
  }

  function getProfileEchographOptions() {
    const p = profile();
    p.echographs = normalizeEchographOptions(p.echographs);
    return p.echographs;
  }

  function getAIBlockSchema(type) {
    const t = String(type || '').toLowerCase();
    const base = AI_BLOCK_SCHEMAS[t] || AI_BLOCK_SCHEMAS.auto;
    const out = {
      ...base,
      fields: Array.isArray(base.fields) ? base.fields.map((f) => ({ ...f })) : []
    };
    if (t === 'auto' || !out.fields.length) return out;
    const opts = getProfileEchographOptions();
    const hasField = out.fields.some((f) => f && f.id === 'echographe');
    if (!hasField) {
      out.fields.unshift({
        id: 'echographe',
        label: 'Echographe',
        type: 'select',
        options: opts
      });
    } else {
      out.fields = out.fields.map((f) => {
        if (!f || f.id !== 'echographe') return f;
        return { ...f, options: opts };
      });
    }
    return out;
  }

  function getAIBlockTypeFromUI() {
    const sel = document.getElementById('ime-ai-block-type');
    const v = String(sel && sel.value || profile().aiBlockType || 'auto').toLowerCase();
    return AI_BLOCK_SCHEMAS[v] ? v : 'auto';
  }

  function getAIModeFromUI() {
    const sel = document.getElementById('ime-ai-mode');
    return clampAIMode(sel && sel.value || profile().aiMode || 'hybride');
  }

  function getAIBlockDataBucket(type) {
    const p = profile();
    if (!p.aiBlockData || typeof p.aiBlockData !== 'object') p.aiBlockData = {};
    const t = String(type || 'auto').toLowerCase();
    if (!p.aiBlockData[t] || typeof p.aiBlockData[t] !== 'object') p.aiBlockData[t] = {};
    return p.aiBlockData[t];
  }

  function setAIBlockFieldValue(type, fieldId, value) {
    const p = profile();
    const bucket = getAIBlockDataBucket(type);
    bucket[String(fieldId || '')] = String(value || '').trim();
    p.aiBlockData[String(type || 'auto').toLowerCase()] = bucket;
    saveState();
    scheduleProfilesPush();
  }

  function readAIBlockDataFromForm() {
    const type = getAIBlockTypeFromUI();
    const out = {};
    const form = document.getElementById('ime-ai-block-form');
    if (form) {
      form.querySelectorAll('[data-ai-block-field]').forEach((el) => {
        const fid = String(el.getAttribute('data-ai-block-field') || '').trim();
        if (!fid) return;
        out[fid] = String(el.value || '').trim();
      });
    }
    const p = profile();
    if (!p.aiBlockData || typeof p.aiBlockData !== 'object') p.aiBlockData = {};
    p.aiBlockData[type] = out;
    saveState();
    scheduleProfilesPush();
    return out;
  }

  function inferExamTypeFromBlockType(type) {
    const schema = getAIBlockSchema(type);
    return schema.examType || 'auto';
  }

  function mapExamTypeToBlockType(examType, text) {
    const t = String(examType || 'auto').toLowerCase();
    const low = String(text || '').toLowerCase();
    const negTVP = /(absence de tvp|pas de tvp|sans tvp|tvp absente|absence de tvs|pas de tvs|sans tvs|tvs absente|absence de thrombose|pas de thrombose|sans thrombose|thrombose absente)/.test(low);
    const tvpMention = /(\btvp\b|\btvs\b|thrombose veineuse profonde|thrombose occlusive|phlebite)/.test(low);
    const urgentWords = /(urgence|urgent|suspi(?:cion)?|suspecte?|aigu[e]?)/.test(low);
    const urgentSymptoms = /(douleur.+mollet|mollet.+douleur|oedeme.+membre|membre.+oedeme|jambe.+oedeme|oedeme.+jambe)/.test(low);
    const urgentTVPCtx = (tvpMention && urgentWords) || urgentSymptoms;
    const hardTVP = /(\btvp\b|\btvs\b|thrombose veineuse profonde|thrombose occlusive)/.test(low);
    const hasTsao = /(tsao|taao|tronc[s]? supra[- ]?aort|carotide|vertebral|vertebrale|sous[- ]?clavi|basilaire|tabc)/.test(low);
    const hasAbdoArt = /(aorte|abdomen|iliaque|visceral|mesenter|coelia|renale|renales|reno[- ]?vascul|interlobair|arquee)/.test(low);
    const hasMiArt = /(membres? inferieurs?|femorale|poplitee|tibiale|peroniere|jambier|arteres? des membres inferieurs|axes arteriels)/.test(low);
    const hasMiVein = /(veines? profondes?|veines? superficielles?|saphene|reflux|varice|tvp|tvs|thrombose veineuse)/.test(low);
    const hasCervicoVein = /(veineux du cou|jugulaire|jugulaires|veines? du cou|sous[- ]?claviere veineuse|subclaviere veineuse|brachiocephalique veineuse)/.test(low);
    const hasVeinAny = hasMiVein || hasCervicoVein;
    const hasArterialAny = /(artere|arteriel|stenose|occlusion|atherome|ips|itb|aomi|tsao|taao|carotide|aorte|renale|femorale|poplitee)/.test(low);
    const isCompleteHint = /\bcomplet\b|complet\s*\*|bilan global|bilan complet/.test(low);
    const isArterialComplete = (hasArterialAny && ((hasTsao && hasAbdoArt) || (hasTsao && hasMiArt) || (hasAbdoArt && hasMiArt))) || (isCompleteHint && hasArterialAny);
    const isMixedComplete = (isArterialComplete && hasVeinAny) || (isCompleteHint && hasArterialAny && hasVeinAny);

    if (isMixedComplete) return 'arterio_veineux_complet';
    if (isArterialComplete) return 'arteriel_complet';
    if (t === 'capillaroscopie') return 'capillaroscopie';
    if (t === 'renales') return (hasTsao || hasMiArt || hasVeinAny) ? (hasVeinAny ? 'arterio_veineux_complet' : 'arteriel_complet') : 'renales';
    if (t === 'tsao') return (hasAbdoArt || hasMiArt || hasVeinAny || isCompleteHint) ? (hasVeinAny ? 'arterio_veineux_complet' : 'arteriel_complet') : 'tsao';
    if (t === 'sclerose') return 'sclerose';
    if (t === 'laser') return 'laser_operatoire';
    if (t === 'fav_creation') return 'fav_creation';
    if (t === 'fav_bilan') return 'fav_bilan';
    if (t === 'tvp_urgence') return 'urgence_tvp';
    if (t === 'arterio_veineux_mi') return (isCompleteHint || (hasTsao && (hasMiVein || hasCervicoVein)) || (hasAbdoArt && (hasMiVein || hasCervicoVein))) ? 'arterio_veineux_complet' : 'arterio_veineux_mi';
    if (t === 'veineux') {
      if (urgentTVPCtx) return 'urgence_tvp';
      if (hardTVP && !negTVP && !/(reflux|varice|saphene|ostial|ostio|tronculaire|pelvien|peri[- ]?uterin|vulvair|inguinal)/.test(low)) return 'urgence_tvp';
      return 'veineux_superficiel';
    }
    if (t === 'arteriel') return isArterialComplete ? 'arteriel_complet' : 'arteriel_mi';

    if (/(capillaroscop|raynaud|acrosyndrom|microangiopath)/.test(low)) return 'capillaroscopie';
    if (/(fistule arterio[- ]?veineuse|\bfav\b|anastomotique)/.test(low)) {
      if (/(creation|cartographie|allen|possibilite|radio[- ]?cephal|ulno[- ]?basil)/.test(low)) return 'fav_creation';
      return 'fav_bilan';
    }
    if (/(arteres? renales?|reno[- ]?vascul|interlobair|arquee|nephro[- ]?angio)/.test(low)) return 'renales';
    if (/(tsao|tronc[s]? supra[- ]?aort|carotide|vertebrale|sous[- ]?claviere|basilaire)/.test(low)) return 'tsao';
    if (/(sclero|echosclero|aetoxisclerol)/.test(low)) return 'sclerose';
    if (/(compte rendu operatoire|laser|endoveineux|phlebectom|tumescence)/.test(low)) return 'laser_operatoire';
    if (urgentTVPCtx) return 'urgence_tvp';
    if (hardTVP && !negTVP && !/(reflux|varice|saphene|ostial|ostio|tronculaire|pelvien|peri[- ]?uterin|vulvair|inguinal)/.test(low)) return 'urgence_tvp';
    if (/(artere|arteriel|occlusion|stenose).*(veine|veineux|reflux|varice)|axes vasculaires des membres inferieurs/.test(low)) return 'arterio_veineux_mi';
    if (/(artere|arteriel|occlusion|stenose|atherome)/.test(low)) return hasMiArt ? 'arteriel_mi' : 'arteriel_complet';
    if (/(veine|veineux|varice|reflux|saphene)/.test(low)) return 'veineux_superficiel';
    return 'auto';
  }

  function suggestAIBlockTypeFromContext() {
    const html = String(readHtml() || '');
    const title = String(getTitle() || '');
    const rawText = `${title}\n${stripTags(html)}`.toLowerCase();
    const examType = inferExamTypeFromContent(html, rawText);
    const out = mapExamTypeToBlockType(examType, rawText);
    return AI_BLOCK_SCHEMAS[out] ? out : 'auto';
  }

  function applySuggestedBlockTypeToUI(persist) {
    const sel = document.getElementById('ime-ai-block-type');
    if (!sel) return 'auto';
    const out = suggestAIBlockTypeFromContext();
    sel.value = AI_BLOCK_SCHEMAS[out] ? out : 'auto';
    if (persist) {
      const p = profile();
      p.aiBlockType = sel.value;
      if (!p.aiBlockData || typeof p.aiBlockData !== 'object') p.aiBlockData = {};
      if (!p.aiBlockData[p.aiBlockType] || typeof p.aiBlockData[p.aiBlockType] !== 'object') p.aiBlockData[p.aiBlockType] = {};
      saveState();
      scheduleProfilesPush();
    }
    renderAIBlockForm();
    return sel.value || 'auto';
  }

  function pickReGroup(text, re, groupIdx) {
    const m = String(text || '').match(re);
    if (!m) return '';
    const idx = Number.isFinite(groupIdx) ? groupIdx : 1;
    return String(m[idx] || '').trim();
  }

  function normalizeNum(v) {
    return String(v || '').trim().replace(',', '.');
  }

  function parseLateralite(low) {
    const hasD = /\bdroit(?:e)?\b/.test(low);
    const hasG = /\bgauch(?:e)?\b/.test(low);
    if (hasD && hasG) return 'Bilateral';
    if (hasD) return 'Droite';
    if (hasG) return 'Gauche';
    return '';
  }

  function parseTVPValue(low) {
    if (/(absence de tvp|pas de tvp|sans tvp|tvp absente)/.test(low)) return 'Absente';
    if (/(suspi(?:cion)? de tvp|tvp suspecte|recherche de tvp)/.test(low)) return 'Suspectee';
    if (/\btvp\b|thrombose veineuse profonde/.test(low)) return 'Presente';
    return '';
  }

  function parseTVSValue(low) {
    if (/(absence de tvs|pas de tvs|sans tvs|tvs absente)/.test(low)) return 'Absente';
    if (/(suspi(?:cion)? de tvs|tvs suspecte|recherche de tvs)/.test(low)) return 'Suspectee';
    if (/\btvs\b|thrombose veineuse superficielle/.test(low)) return 'Presente';
    return '';
  }

  function parseRefluxTrunkValue(low, trunk) {
    const t = trunk === 'pvs' ? 'pvs|petite veine saphene|saphene externe' : 'gvs|grande veine saphene|saphene interne';
    const hasTrunk = new RegExp(`\\b(${t})\\b`, 'i').test(low);
    if (!hasTrunk) return '';
    if (new RegExp(`(absence de|pas de|sans)\\s+reflux[^\\n\\r]{0,25}\\b(${t})\\b`, 'i').test(low)) return 'Absent';
    if (new RegExp(`\\breflux\\b[^\\n\\r]{0,35}\\b(${t})\\b[^\\n\\r]{0,25}\\b(bilateral|bilaterale|bilateral)\\b`, 'i').test(low)) return 'Bilateral';
    if (new RegExp(`\\breflux\\b[^\\n\\r]{0,35}\\b(${t})\\b[^\\n\\r]{0,25}\\bdroit(?:e)?\\b`, 'i').test(low)) return 'Droit';
    if (new RegExp(`\\breflux\\b[^\\n\\r]{0,35}\\b(${t})\\b[^\\n\\r]{0,25}\\bgauch(?:e)?\\b`, 'i').test(low)) return 'Gauche';
    if (new RegExp(`\\breflux\\b[^\\n\\r]{0,35}\\b(${t})\\b`, 'i').test(low)) return 'Bilateral';
    return '';
  }

  function parseRefluxPelvienValue(low) {
    if (/(absence de reflux pelvien|pas de reflux pelvien|sans reflux pelvien)/.test(low)) return 'Absent';
    if (/(reflux pelvien suspect|suspi(?:cion)? de reflux pelvien)/.test(low)) return 'Suspecte';
    if (/\breflux pelvien\b/.test(low)) return 'Present';
    return '';
  }

  function parsePelvicVaricesFlag(low, kind) {
    const key = kind === 'peri_uterines' ? 'peri[- ]?uterin' : '(vulvair|inguinal)';
    if (new RegExp(`(absence de|pas de|sans)\\s+varices?\\s+${key}`, 'i').test(low)) return 'Non';
    if (new RegExp(`varices?\\s+${key}\\s+(suspecte|suspectes)|suspi(?:cion)?\\s+de\\s+varices?\\s+${key}`, 'i').test(low)) return 'Suspectes';
    if (new RegExp(`varices?\\s+${key}`, 'i').test(low)) return 'Presentes';
    return '';
  }

  function extractIpsiValue(text, side) {
    const s = side === 'gauche' ? '(gauch(?:e)?)' : '(droit(?:e)?)';
    const r1 = new RegExp(`(?:ips|itb|index cheville bras)[^\\n\\r]{0,25}${s}[^\\d]{0,8}(\\d(?:[.,]\\d{1,2})?)`, 'i');
    const r2 = new RegExp(`${s}[^\\n\\r]{0,20}(?:ips|itb|index cheville bras)[^\\d]{0,8}(\\d(?:[.,]\\d{1,2})?)`, 'i');
    const v = pickReGroup(text, r1, 2) || pickReGroup(text, r2, 2);
    return normalizeNum(v);
  }

  function extractStenoseValue(text) {
    const v = pickReGroup(text, /stenose[^%\n\r]{0,80}?(\d{1,3}(?:\s*[-a]\s*\d{1,3})?)\s*%/i, 1)
      || pickReGroup(text, /(\d{1,3}(?:\s*[-a]\s*\d{1,3})?)\s*%[^.\n\r]{0,40}stenose/i, 1);
    return v ? `${String(v).replace(/\s+/g, ' ').trim()}%` : '';
  }

  function extractAIBlockDataFromCurrentCR(type) {
    const html = String(readHtml() || '');
    const txt = `${String(getTitle() || '')}\n${stripTags(html)}`.trim();
    const low = txt.toLowerCase();
    const t = String(type || '').toLowerCase();
    const out = {};
    if (!txt) return out;

    const lat = parseLateralite(low);
    const ipsD = extractIpsiValue(txt, 'droit');
    const ipsG = extractIpsiValue(txt, 'gauche');
    const sten = extractStenoseValue(txt);
    const tvp = parseTVPValue(low);
    const tvs = parseTVSValue(low);
    const rgvs = parseRefluxTrunkValue(low, 'gvs');
    const rpvs = parseRefluxTrunkValue(low, 'pvs');
    const rpelv = parseRefluxPelvienValue(low);
    const vPeriU = parsePelvicVaricesFlag(low, 'peri_uterines');
    const vVulvI = parsePelvicVaricesFlag(low, 'vulv_ingu');

    if (t === 'arteriel_mi' || t === 'arteriel_complet') {
      if (lat) out.lateralite = lat;
      if (sten) out.degre_stenose = sten;
      if (ipsD) out.ips_droit = ipsD;
      if (ipsG) out.ips_gauche = ipsG;
      if (/\bmonophasique\b/.test(low)) out.flux_aval = 'Monophasique';
      else if (/\bamorti\b/.test(low)) out.flux_aval = 'Amorti';
      else if (/\bflux\b[^.\n\r]{0,20}\b(absent|nul)\b/.test(low)) out.flux_aval = 'Absent';
      else if (/\btriphasique\b|\bbiphasique\b|\bflux normal\b/.test(low)) out.flux_aval = 'Normal';
      if (t === 'arteriel_complet' && out.flux_aval && !out.flux_distal) out.flux_distal = out.flux_aval;
    }

    if (t === 'veineux_superficiel' || t === 'arterio_veineux_mi' || t === 'arterio_veineux_complet') {
      if (lat) out.lateralite = lat;
      if (tvp) out.tvp = tvp;
      if (tvs) out.tvs = tvs;
      if (rgvs) out.reflux_gvs = rgvs;
      if (rpvs) out.reflux_pvs = rpvs;
      if (rpelv) out.reflux_pelvien = rpelv;
      if (vPeriU) out.varices_peri_uterines = vPeriU;
      if (vVulvI) out.varices_vulvaires_inguinales = vVulvI;
      if (ipsD) out.ips_droit = ipsD;
      if (ipsG) out.ips_gauche = ipsG;
    }

    if (t === 'urgence_tvp') {
      if (lat) out.cote_symptomatique = lat === 'Bilateral' ? 'Bilateral' : lat;
      if (tvp) out.tvp = tvp;
      if (tvs) out.tvs = tvs;
    }
    return out;
  }

  function prefillAIBlockDataFromCurrentCR(type) {
    const t = String(type || '').toLowerCase();
    if (!t || t === 'auto') return 0;
    const extracted = extractAIBlockDataFromCurrentCR(t);
    const keys = Object.keys(extracted).filter((k) => String(extracted[k] || '').trim());
    if (!keys.length) return 0;
    const p = profile();
    if (!p.aiBlockData || typeof p.aiBlockData !== 'object') p.aiBlockData = {};
    const prev = p.aiBlockData[t] && typeof p.aiBlockData[t] === 'object' ? p.aiBlockData[t] : {};
    p.aiBlockData[t] = { ...prev, ...extracted };
    saveState();
    scheduleProfilesPush();
    return keys.length;
  }

  function buildAIBlockSummary(type, data) {
    const schema = getAIBlockSchema(type);
    if (!schema.fields || !schema.fields.length) return '';
    const lines = [];
    schema.fields.forEach((f) => {
      const val = String(data && data[f.id] || '').trim();
      if (!val) return;
      lines.push(`- ${f.label}: ${val}`);
    });
    if (!lines.length) return '';
    return [`DONNEES STRUCTUREES (BLOCS) - ${schema.label}:`, ...lines].join('\n');
  }

  function countFilledBlockFields(type, data) {
    const schema = getAIBlockSchema(type);
    if (!schema.fields || !schema.fields.length) return 0;
    let n = 0;
    schema.fields.forEach((f) => {
      const v = String(data && data[f.id] || '').trim();
      if (v) n += 1;
    });
    return n;
  }

  function htmlCompareFingerprint(html) {
    return stripTags(html)
      .toLowerCase()
      .replace(/[’'`"]/g, '')
      .replace(/\s+/g, ' ')
      .trim();
  }

  function isMeaningfullyUnchangedHtml(a, b) {
    const fa = htmlCompareFingerprint(a);
    const fb = htmlCompareFingerprint(b);
    return !!fa && !!fb && fa === fb;
  }

  function buildStrictBlocksApplyPrompt(inferredType) {
    return [
      'Tu appliques strictement des donnees structurees (blocs) a un compte-rendu medical vasculaire HTML existant.',
      `Type detecte: ${getExamTypeLabel(inferredType)}.`,
      'Ne casse pas la structure HTML.',
      'Priorite absolue aux DONNEES BLOCS non vides: elles remplacent les valeurs contradictoires du texte existant.',
      'Si un champ bloc est vide, conserver la formulation existante correspondante.',
      'Ne pas ignorer les donnees blocs sous pretexte de style de trame.',
      'Conserver une redaction professionnelle concise.',
      'Renvoie uniquement le HTML complet.'
    ].join('\n');
  }

  function buildEchographeDirective(type, data) {
    const t = String(type || '').toLowerCase();
    if (t === 'auto') return '';
    const selected = String(data && data.echographe || '').trim();
    if (!selected) return '';
    return [
      `CONTRAINTE MATERIEL: echographe unique = "${selected}".`,
      'Conserver uniquement cet echographe dans le compte-rendu final et remplacer toute autre mention d appareil par ce choix.'
    ].join(' ');
  }

  function getVeinFunctionalPolicy(type, data) {
    const t = String(type || '').toLowerCase();
    if (!(t === 'veineux_superficiel' || t === 'arterio_veineux_mi' || t === 'arterio_veineux_complet')) return '';
    const raw = String(data && data.insuffisance_fonctionnelle || '').trim().toLowerCase();
    if (!raw) return '';
    if (raw === 'non') return 'non';
    if (raw.includes('associe')) return 'associee';
    if (raw.includes('isolee')) return 'isolee';
    return '';
  }

  function buildVeinFunctionalDirective(type, data) {
    const policy = getVeinFunctionalPolicy(type, data);
    if (!policy) return '';
    if (policy === 'non') {
      return 'CONTRAINTE CLINIQUE VEINEUSE: ne pas utiliser le terme "insuffisance veineuse fonctionnelle" dans la synthese finale.';
    }
    if (policy === 'associee') {
      return [
        'CONTRAINTE CLINIQUE VEINEUSE: composante fonctionnelle associee autorisee.',
        'Si reflux pathologique present, conclure d abord a l insuffisance veineuse organique puis mentionner la composante fonctionnelle associee.'
      ].join(' ');
    }
    if (policy === 'isolee') {
      return [
        'CONTRAINTE CLINIQUE VEINEUSE: conclure a une insuffisance veineuse fonctionnelle isolee.',
        'Ne decrire aucun reflux veineux pathologique comme cible therapeutique invasive.'
      ].join(' ');
    }
    return '';
  }

  function buildPelvicVenousDirective(type, data) {
    const t = String(type || '').toLowerCase();
    if (!(t === 'veineux_superficiel' || t === 'arterio_veineux_mi' || t === 'arterio_veineux_complet' || t === 'sclerose')) return '';
    const low = (v) => String(v || '').trim().toLowerCase();
    const refluxPelvien = low(data && data.reflux_pelvien);
    const periUter = low(data && data.varices_peri_uterines);
    const vulvIngu = low(data && data.varices_vulvaires_inguinales);
    const freeText = [
      data && data.notes,
      data && data.veineux_superficiel,
      data && data.synthese,
      data && data.cartographie
    ].map((x) => low(x)).join('\n');
    const refluxPelvienPos = refluxPelvien.startsWith('present') || refluxPelvien.startsWith('suspect');
    const periUterPos = periUter.startsWith('present') || periUter.startsWith('suspect');
    const vulvInguPos = vulvIngu.startsWith('present') || vulvIngu.startsWith('suspect');
    const atypicalHint = /(reflux atypique|sans reflux ostio|sans reflux troncul|varice vulvair|varice inguinal|origine pelvien)/.test(freeText);
    if (!(refluxPelvienPos || periUterPos || vulvInguPos || atypicalHint)) return '';
    return [
      'CONTRAINTE ORIGINE VEINEUSE PELVIENNE:',
      'si ces signes sont retenus, conclure a une suspicion d origine pelvienne des varices/reflux.',
      'Orientation recommandee: IRM pelvienne + avis de radiologie interventionnelle pour discussion d embolisation,',
      'avant tout geste veineux des membres inferieurs isole.'
    ].join(' ');
  }

  function updateAIBlocksHint() {
    const hint = document.getElementById('ime-ai-blocks-hint');
    if (!hint) return;
    const mode = getAIModeFromUI();
    const type = getAIBlockTypeFromUI();
    const schema = getAIBlockSchema(type);
    const modeTxt = mode === 'dictee'
      ? 'Mode dictee: blocs ignores lors de la generation.'
      : (mode === 'blocs'
        ? 'Mode blocs: generation possible sans dictee si les blocs sont renseignes.'
        : 'Mode hybride: blocs + dictee combines dans le prompt.');
    hint.textContent = `${modeTxt} ${schema.help || ''}`.trim();
  }

  function renderAIBlockForm() {
    const wrap = document.getElementById('ime-ai-block-form');
    if (!wrap) return;
    const type = getAIBlockTypeFromUI();
    const schema = getAIBlockSchema(type);
    const stored = getAIBlockDataBucket(type);
    wrap.innerHTML = '';

    if (!schema.fields || !schema.fields.length) {
      const empty = document.createElement('div');
      empty.style.color = '#64748b';
      empty.style.fontWeight = '700';
      empty.style.fontSize = '12px';
      empty.textContent = 'Aucun bloc actif. Choisissez un type de blocs ou restez en mode dictee.';
      wrap.appendChild(empty);
      updateAIBlocksHint();
      return;
    }

    schema.fields.forEach((f) => {
      const row = document.createElement('div');
      row.className = 'ime-ai-bf';

      const lab = document.createElement('label');
      lab.textContent = f.label;
      row.appendChild(lab);

      let ctl = null;
      if (f.type === 'select') {
        ctl = document.createElement('select');
        const first = document.createElement('option');
        first.value = '';
        first.textContent = '-';
        ctl.appendChild(first);
        (Array.isArray(f.options) ? f.options : []).forEach((opt) => {
          const o = document.createElement('option');
          o.value = String(opt);
          o.textContent = String(opt);
          ctl.appendChild(o);
        });
      } else if (f.type === 'textarea') {
        ctl = document.createElement('textarea');
        ctl.rows = 2;
      } else {
        ctl = document.createElement('input');
        ctl.type = 'text';
      }

      ctl.setAttribute('data-ai-block-field', f.id);
      if (f.placeholder) ctl.placeholder = f.placeholder;
      ctl.value = String(stored && stored[f.id] || '');
      const persist = () => setAIBlockFieldValue(type, f.id, ctl.value);
      ctl.addEventListener('change', persist);
      ctl.addEventListener('blur', persist);
      row.appendChild(ctl);
      wrap.appendChild(row);
    });

    const clearBtn = document.getElementById('ime-ai-block-clear');
    if (clearBtn) clearBtn.disabled = type === 'auto';
    updateAIBlocksHint();
  }

  function clearAIBlockFormData() {
    const type = getAIBlockTypeFromUI();
    if (type === 'auto') return;
    if (!confirm('Vider les blocs pour ce type ?')) return;
    const p = profile();
    if (!p.aiBlockData || typeof p.aiBlockData !== 'object') p.aiBlockData = {};
    p.aiBlockData[type] = {};
    saveState();
    scheduleProfilesPush();
    renderAIBlockForm();
  }

  function applyAIBlocksProfileToUI() {
    const p = profile();
    const modeSel = document.getElementById('ime-ai-mode');
    const typeSel = document.getElementById('ime-ai-block-type');
    if (modeSel) modeSel.value = clampAIMode(p.aiMode || 'hybride');
    if (typeSel) {
      const t = String(p.aiBlockType || 'auto').toLowerCase();
      typeSel.value = AI_BLOCK_SCHEMAS[t] ? t : 'auto';
    }
    renderAIBlockForm();
  }

  function buildEffectiveInstructionForAI(rawInstruction, cleanedInstruction) {
    const mode = getAIModeFromUI();
    const blockType = getAIBlockTypeFromUI();
    const blockData = readAIBlockDataFromForm();
    const blockSummary = buildAIBlockSummary(blockType, blockData);
    const echographeDirective = buildEchographeDirective(blockType, blockData);
    const veinFunctionalDirective = buildVeinFunctionalDirective(blockType, blockData);
    const pelvicDirective = buildPelvicVenousDirective(blockType, blockData);
    const dictationText = String(cleanedInstruction || rawInstruction || '').trim();
    const parts = [];

    if (mode === 'blocs') {
      if (blockSummary) parts.push(blockSummary);
      if (echographeDirective) parts.push(echographeDirective);
      if (veinFunctionalDirective) parts.push(veinFunctionalDirective);
      if (pelvicDirective) parts.push(pelvicDirective);
      if (dictationText) parts.push(`NOTES LIBRES:\n${dictationText}`);
    } else if (mode === 'hybride') {
      if (blockSummary) parts.push(blockSummary);
      if (echographeDirective) parts.push(echographeDirective);
      if (veinFunctionalDirective) parts.push(veinFunctionalDirective);
      if (pelvicDirective) parts.push(pelvicDirective);
      if (dictationText) parts.push(`DICTEE / TEXTE LIBRE:\n${dictationText}`);
    } else {
      if (dictationText) parts.push(dictationText);
    }

    return {
      mode,
      blockType,
      blockData,
      blockSummary,
      text: parts.join('\n\n').trim()
    };
  }

  function getSpeechCtor() {
    return window.SpeechRecognition || window.webkitSpeechRecognition || null;
  }

  function speechSupported() {
    return !!getSpeechCtor();
  }

  function backendSpeechSupported() {
    return !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia && window.MediaRecorder);
  }

  function updateMicControls() {
    const startBtn = document.getElementById('ime-ai-mic');
    const p = profile();
    const mode = p.sttEngine || DEFAULT_STT_ENGINE;
    const supported = mode === 'openai' ? backendSpeechSupported() : speechSupported();
    if (startBtn) {
      startBtn.disabled = !supported;
      if (!supported) startBtn.textContent = '🎤 Micro KO';
      else startBtn.textContent = sttRunning ? '⏹ Stop dictee' : (mode === 'openai' ? '🎤 PTT IA' : '🎤 Dicter');
    }
  }

  function toggleDictation() {
    if (sttRunning || sttWantRun) stopDictation(false);
    else startDictation();
  }

  async function startBackendDictation() {
    if (sttBackendBusy) return;
    const p = profile();
    if (!backendSpeechSupported()) return alert('MediaRecorder indisponible dans ce navigateur.');
    sttBackendBusy = true;
    try {
      if (!sttStream) {
        sttStream = await navigator.mediaDevices.getUserMedia({ audio: true });
      }
      sttChunks = [];
      const mime = MediaRecorder.isTypeSupported('audio/webm;codecs=opus') ? 'audio/webm;codecs=opus' : 'audio/webm';
      sttRecorder = new MediaRecorder(sttStream, { mimeType: mime });
      sttRecorder.ondataavailable = (ev) => {
        if (ev.data && ev.data.size > 0) sttChunks.push(ev.data);
      };
      sttRecorder.onstop = async () => {
        try {
          const blob = new Blob(sttChunks, { type: mime });
          if (blob.size < 3000) {
            aiStatus('Dictee trop courte.');
            return;
          }
          aiStatus('Transcription IA...');
          const rawText = await transcribeWithOpenAI(blob, p.sttLang || DEFAULT_STT_LANG);
          const dictPairs = parseDictPairs(p.dictRaw || '');
          const dictText = applyPersonalDictionary(rawText, dictPairs);
          const strict = !!(document.getElementById('ime-ai-filter') && document.getElementById('ime-ai-filter').checked);
          const cleaned = sanitizeDictationChunk(dictText, strict);
          appendInstructionText(cleaned || dictText);
          aiStatus('Dictee ajoutee.');
        } catch (e) {
          aiStatus(`Erreur transcription: ${e?.message || e}`);
        } finally {
          sttBackendBusy = false;
          sttRunning = false;
          sttWantRun = false;
          updateMicControls();
        }
      };
      sttRecorder.start(240);
      sttRunning = true;
      sttWantRun = true;
      updateMicControls();
      aiStatus('Dictee backend en cours...');
    } catch (e) {
      sttBackendBusy = false;
      sttRunning = false;
      sttWantRun = false;
      updateMicControls();
      aiStatus(`Erreur micro: ${e?.message || e}`);
    }
  }

  function startDictation() {
    const p = profile();
    if ((p.sttEngine || DEFAULT_STT_ENGINE) === 'openai') {
      startBackendDictation();
      return;
    }
    if (!speechSupported()) return alert('Reconnaissance vocale indisponible dans ce navigateur.');
    if (sttRunning) return;

    const Ctor = getSpeechCtor();
    if (!sttRec) {
      sttRec = new Ctor();
      sttRec.lang = DEFAULT_STT_LANG;
      sttRec.continuous = true;
      sttRec.interimResults = true;
      sttRec.maxAlternatives = 1;

      sttRec.onstart = () => {
        sttRunning = true;
        updateMicControls();
        aiStatus('Dictee en cours...');
      };

      sttRec.onerror = (ev) => {
        const code = ev && ev.error ? String(ev.error) : 'unknown';
        if (code === 'not-allowed' || code === 'service-not-allowed') {
          sttWantRun = false;
          sttRunning = false;
        }
        updateMicControls();
        aiStatus(`Micro erreur: ${code}`);
      };

      sttRec.onend = () => {
        sttRunning = false;
        updateMicControls();
        aiLive('');
        if (sttWantRun) {
          try {
            setTimeout(() => { try { sttRec.start(); } catch (e) {} }, 220);
            return;
          } catch (e) {}
        }
        aiStatus('Dictee arretee.');
      };

      sttRec.onresult = (event) => {
        const strict = !!(document.getElementById('ime-ai-filter') && document.getElementById('ime-ai-filter').checked);
        const finals = [];
        let interim = '';
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const r = event.results[i];
          const txt = String(r && r[0] && r[0].transcript || '').trim();
          if (!txt) continue;
          if (r.isFinal) finals.push(txt);
          else interim += ` ${txt}`;
        }
        const dictPairs = parseDictPairs(profile().dictRaw || '');
        const toAdd = finals
          .map((x) => {
            const dictText = applyPersonalDictionary(x, dictPairs);
            const cleaned = sanitizeDictationChunk(dictText, strict);
            return cleaned || dictText;
          })
          .filter(Boolean)
          .join('\n');
        if (toAdd) appendInstructionText(toAdd);
        aiLive(interim.trim() ? `Ecoute: ${interim.trim()}` : '');
      };
    }

    sttRec.lang = p.sttLang || DEFAULT_STT_LANG;
    sttWantRun = true;
    try {
      sttRec.start();
      aiStatus('Demarrage micro...');
    } catch (e) {
      aiStatus('Impossible de demarrer le micro.');
    }
  }

  function stopDictation(silent) {
    const p = profile();
    if ((p.sttEngine || DEFAULT_STT_ENGINE) === 'openai') {
      sttWantRun = false;
      try {
        if (sttRecorder && sttRecorder.state !== 'inactive') sttRecorder.stop();
      } catch (e) {}
      sttRunning = false;
      updateMicControls();
      aiLive('');
      if (!silent) aiStatus('Dictee arretee.');
      return;
    }
    sttWantRun = false;
    try {
      if (sttRec && sttRunning) sttRec.stop();
    } catch (e) {}
    sttRunning = false;
    updateMicControls();
    aiLive('');
    if (!silent) aiStatus('Dictee arretee.');
  }

  async function aiGenerate(isModify, opts) {
    if (inFlight) return;
    const autoApply = !!(opts && opts.autoApply);
    const p = profile();
    const box = document.getElementById('ime-ai-preview');
    const ins = document.getElementById('ime-ai-instruction');
    const sal = document.getElementById('ime-ai-salutation');
    const filterCb = document.getElementById('ime-ai-filter');

    const strictFilter = filterCb ? !!filterCb.checked : !!p.sttFilter;
    const dictPairs = parseDictPairs(p.dictRaw || '');
    const rawInstruction = applyPersonalDictionary(String(ins && ins.value || '').trim(), dictPairs);
    const cleanedInstruction = sanitizeDictationChunk(rawInstruction, strictFilter);
    const effective = buildEffectiveInstructionForAI(rawInstruction, cleanedInstruction);
    const instruction = effective.text;
    const blockFieldsFilled = countFilledBlockFields(effective.blockType, effective.blockData);
    const hasBlockInput = effective.mode !== 'dictee' && blockFieldsFilled > 0;
    const veinFunctionalPolicy = getVeinFunctionalPolicy(effective.blockType, effective.blockData);
    if (effective.mode === 'dictee' && blockFieldsFilled > 0 && !String(cleanedInstruction || '').trim()) {
      return alert('Mode dictee actif: les blocs sont ignores. Passe en mode Hybride ou Blocs pour appliquer les champs remplis.');
    }
    if (!instruction) {
      if (effective.mode === 'blocs') return alert('Blocs vides. Renseigne au moins un champ bloc ou ajoute une note libre.');
      return alert('Instruction vide.');
    }

    const previewWrap = document.getElementById('ime-ai-preview-wrap');
    const previewVisible = !!(previewWrap && previewWrap.style.display === 'block');
    const previewRaw = String(LAST_AI_HTML_RAW || '').trim();
    const liveHtml = String(readHtml() || '').trim();
    const savedHtml = String(p.lastHtml || '').trim();

    let baseHtml = '';
    if (isModify || (previewVisible && previewRaw.length > 40)) {
      // Workflow iteratif: si un resultat IA existe deja dans la session, repartir dessus.
      if (previewVisible && previewRaw.length > 40) baseHtml = previewRaw;
      else if (liveHtml.length > 40) baseHtml = liveHtml;
      else baseHtml = savedHtml || String(box && box.innerHTML || '').trim();
    } else baseHtml = liveHtml;
    if (!baseHtml || baseHtml.length < 40) return alert('Aucun HTML source detecte.');

    const blockHintExam = inferExamTypeFromBlockType(effective.blockType);
    const inferInput = [instruction, effective.blockSummary].filter(Boolean).join('\n');
    let examType = inferExamTypeFromContent(baseHtml, inferInput);
    if (blockHintExam && blockHintExam !== 'auto') examType = blockHintExam;
    const pat = patient();
    const safeHtml = anonymize(baseHtml, pat);
    const safeInstruction = anonymize(instruction, pat);
    const salu = String(sal && sal.value || p.salutation || 'Cher Confrere,').trim();

    p.salutation = salu;
    p.examType = examType;
    p.sttFilter = strictFilter;
    p.aiMode = effective.mode;
    p.aiBlockType = effective.blockType;
    if (!p.aiBlockData || typeof p.aiBlockData !== 'object') p.aiBlockData = {};
    p.aiBlockData[effective.blockType] = effective.blockData || {};
    saveState();
    scheduleProfilesPush();

    const system = buildAISystemPrompt(isModify, examType);
    const user = isModify
      ? `TYPE_EXAMEN DETECTE: ${getExamTypeLabel(examType)}\nSALUTATION A CONSERVER: ${salu}\n\nHTML ACTUEL:\n${safeHtml}\n\nINSTRUCTION:\n${safeInstruction}\n\nRENVOIE UNIQUEMENT LE HTML COMPLET.`
      : `TYPE_EXAMEN DETECTE: ${getExamTypeLabel(examType)}\nSALUTATION: ${salu}\n\nTRAME HTML:\n${safeHtml}\n\nDICTEE:\n${safeInstruction}\n\nRENVOIE UNIQUEMENT LE HTML COMPLET.`;

    try {
      inFlight = true;
      aiStatus('Generation...');
      const raw = await aiCall(system, user, 0.18);
      let out = stripFences(raw);
      if (!/[<][a-z!\/]/i.test(out) || out.length < 40) throw new Error('Sortie IA invalide (pas du HTML).');
      if (hasBlockInput && isMeaningfullyUnchangedHtml(baseHtml, out)) {
        try {
          aiStatus('Application stricte des blocs...');
          const safeOutStrict = anonymize(out, pat);
          const safeBlockSummary = anonymize(String(effective.blockSummary || ''), pat);
          const rawStrict = await aiCall(
            buildStrictBlocksApplyPrompt(examType),
            `HTML ACTUEL:\n${safeOutStrict}\n\nDONNEES BLOCS:\n${safeBlockSummary || '(aucune)'}\n\nINSTRUCTION:\n${safeInstruction}\n\nAPPLIQUE STRICTEMENT LES DONNEES BLOCS NON VIDES ET RENVOIE UNIQUEMENT LE HTML COMPLET.`,
            0.05
          );
          const outStrict = stripFences(rawStrict);
          if (/[<][a-z!\/]/i.test(outStrict) && outStrict.length > 40) out = outStrict;
        } catch (e) {}
      }
      const outTxt0 = stripTags(out).toLowerCase();
      const needsConclusion = !/\b(conclusion|au total)\b/.test(outTxt0);
      if (needsConclusion) {
        try {
          aiStatus('Ajout de la conclusion...');
          const safeOut = anonymize(out, pat);
          const raw2 = await aiCall(
            buildConclusionPatchPrompt(examType),
            `HTML ACTUEL:\n${safeOut}\n\nDICTEE:\n${safeInstruction}\n\nAJOUTE/RENFORCE LA CONCLUSION (normal vs anormal + recommandations). RENVOIE UNIQUEMENT LE HTML COMPLET.`,
            0.1
          );
          const out2 = stripFences(raw2);
          if (/[<][a-z!\/]/i.test(out2) && out2.length > 40) out = out2;
        } catch (e) {}
      }
      if (needsSummaryHarmonization(out, examType, veinFunctionalPolicy)) {
        try {
          aiStatus('Harmonisation de la synthese...');
          const safeOut3 = anonymize(out, pat);
          const raw3 = await aiCall(
            buildSummaryHarmonizePrompt(examType, veinFunctionalPolicy),
            `HTML ACTUEL:\n${safeOut3}\n\nDICTEE:\n${safeInstruction}\n\nHARMONISE LA SYNTHESE FINALE SANS DOUBLON NI CONTRADICTION. RENVOIE UNIQUEMENT LE HTML COMPLET.`,
            0.1
          );
          const out3 = stripFences(raw3);
          if (/[<][a-z!\/]/i.test(out3) && out3.length > 40) out = out3;
        } catch (e) {}
      }
      out = deanonymize(out, pat);
      out = forceSalutationInHtml(out, salu);
      LAST_AI_HTML_RAW = out;
      const unchangedFromBase = isMeaningfullyUnchangedHtml(baseHtml, out);
      const qc = buildClinicalQC(out, examType, veinFunctionalPolicy);
      aiQcRender(qc);
      const viewHtml = p.uncertaintyOn ? highlightUncertaintyHtml(out) : out;
      if (box) box.innerHTML = viewHtml;
      p.lastHtml = out;
      saveState();
      scheduleProfilesPush();
      document.getElementById('ime-ai-preview-wrap').style.display = 'block';
      document.getElementById('ime-ai-ins').style.display = 'inline-block';
      if (ins) ins.value = '';
      aiLive('');
      if (autoApply) {
        if ((qc.critical || []).length) {
          aiStatus('QC bloque application automatique.');
        } else if (!writeHtml(out)) {
          aiStatus('Genere, mais application impossible.');
        } else {
          aiStatus('Genere et applique.');
          closeAI();
          return;
        }
      } else if (hasBlockInput && unchangedFromBase) {
        aiStatus('Apercu genere mais inchange. Verifie le mode IA, les blocs, ou ajoute une note libre.');
      } else {
        aiStatus('Apercu genere. Clique Inserer ou Generer + Appliquer.');
      }
    } catch (e) {
      console.error(e);
      aiStatus('Erreur.');
      alert(`Erreur IA: ${e && e.message || e}`);
    } finally {
      inFlight = false;
    }
  }

  function openAI() {
    if (!hasCR()) return alert('Assistant IA disponible uniquement sur page CR/examen.');
    const o = document.getElementById('ime-ai-overlay');
    if (!o) return;
    const p = profile();
    const s = document.getElementById('ime-ai-salutation');
    const filterCb = document.getElementById('ime-ai-filter');
    const engineSel = document.getElementById('ime-ai-engine');
    const uncCb = document.getElementById('ime-ai-uncertain');
    const modeSel = document.getElementById('ime-ai-mode');
    const blockTypeSel = document.getElementById('ime-ai-block-type');
    let autoBlockType = 'auto';
    if (s) s.value = p.salutation || 'Cher Confrere,';
    if (filterCb) filterCb.checked = typeof p.sttFilter === 'boolean' ? p.sttFilter : true;
    if (engineSel) engineSel.value = p.sttEngine || DEFAULT_STT_ENGINE;
    if (uncCb) uncCb.checked = typeof p.uncertaintyOn === 'boolean' ? p.uncertaintyOn : true;
    if (modeSel) modeSel.value = clampAIMode(p.aiMode || 'hybride');
    if (blockTypeSel) {
      const t = String(p.aiBlockType || 'auto').toLowerCase();
      blockTypeSel.value = AI_BLOCK_SCHEMAS[t] ? t : 'auto';
    }
    applyAIBlocksProfileToUI();
    autoBlockType = applySuggestedBlockTypeToUI(false);
    o.style.display = 'flex';
    LAST_AI_HTML_RAW = '';
    aiQcRender({ critical: [], warning: [], info: [] });
    aiLive('');
    updateMicControls();
    if (!speechSupported() && !backendSpeechSupported()) aiStatus('Micro navigateur indisponible. Utilise Chrome/Edge HTTPS.');
    else aiStatus(`Pret. PTT: maintenir 🎤 ou touche F8. Bloc suggere: ${getAIBlockSchema(autoBlockType).label}.`);
    const i = document.getElementById('ime-ai-instruction');
    if (i) i.focus();
  }

  function closeAI() {
    stopDictation(true);
    try {
      if (sttStream) {
        sttStream.getTracks().forEach((t) => t.stop());
        sttStream = null;
      }
    } catch (e) {}
    const o = document.getElementById('ime-ai-overlay');
    if (o) o.style.display = 'none';
    aiLive('');
    LAST_AI_HTML_RAW = '';
    aiQcRender({ critical: [], warning: [], info: [] });
    aiStatus('');
  }

  function insertAI() {
    const box = document.getElementById('ime-ai-preview');
    const html = String(LAST_AI_HTML_RAW || (box && box.innerHTML) || '').trim();
    if (!html || html.length < 40) return alert('Rien a inserer.');
    if ((LAST_AI_QC.critical || []).length) {
      if (!confirm(`QC critique detecte (${LAST_AI_QC.critical.join(' | ')}). Inserer quand meme ?`)) return;
    }
    if (!writeHtml(html)) return alert('Insertion impossible.');
    closeAI();
  }

  function hasCR() {
    if (!/(patient_infos|monecho_exam|openexam|examen|report|cr|compte[-_ ]?rendu|echodoppler|doppler|consultation|imagerie|vascular|cardio)/i.test(location.href)) return false;
    return !!findCtx();
  }

  function mountUI() {
    if (document.getElementById('ime-dock')) return;

    const style = document.createElement('style');
    style.id = 'ime-style';
    style.textContent = `
      #ime-dock{position:fixed;right:16px;top:50%;transform:translateY(-50%);z-index:2147483647;display:none;flex-direction:column;align-items:flex-end;gap:8px}
      #ime-prof{font:700 11px/1 Arial,sans-serif;color:#fff;background:#111827;border-radius:999px;padding:6px 10px;max-width:220px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;box-shadow:0 4px 12px rgba(0,0,0,.2)}
      .ime-btn{width:48px;height:48px;border-radius:50%;border:2px solid #fff;color:#fff;cursor:pointer;font-size:21px;display:inline-flex;align-items:center;justify-content:center;box-shadow:0 8px 18px rgba(0,0,0,.28)}
      #ime-b-tr{background:#16a34a}#ime-b-cp{background:#0ea5e9}#ime-b-pt{background:#f59e0b}#ime-b-ai{background:#dc2626}#ime-b-dc{background:#4f46e5}#ime-b-bi{background:#0f766e}#ime-b-or{background:#9333ea}#ime-b-bq{background:#b91c1c}
      #ime-trames,#ime-billing,#ime-ordos{display:none;width:350px;max-height:440px;overflow:auto;background:#fff;border-radius:12px;box-shadow:0 10px 24px rgba(0,0,0,.24);padding:10px}
      .ime-trame{display:block;width:100%;text-align:left;padding:9px;border:1px solid #ddd;border-radius:8px;background:#f8fafc;margin-bottom:6px;font:600 13px/1.2 Arial,sans-serif;cursor:pointer}
      .ime-mini{display:inline-flex;align-items:center;justify-content:center;padding:7px 8px;border:1px solid #ddd;background:#f8fafc;border-radius:8px;font:700 12px/1 Arial,sans-serif;cursor:pointer}
      .ime-mini.danger{background:#fee2e2;border-color:#fecaca}
      .ime-head{font:900 13px/1 Arial,sans-serif;color:#111827;margin:2px 0 8px}
      .ime-tools{display:flex;gap:6px;flex-wrap:wrap;margin-bottom:8px}
      #ime-ai-overlay{position:fixed;inset:0;background:rgba(0,0,0,.08);display:none;align-items:center;justify-content:center;z-index:2147483647}
      #ime-ai-modal{width:1100px;max-width:97vw;max-height:92vh;overflow:auto;background:#fff;border-radius:16px;padding:18px;font-family:Arial,sans-serif;box-shadow:0 20px 50px rgba(0,0,0,.18)}
      #ime-ai-top{display:flex;align-items:center;justify-content:space-between;gap:12px}#ime-ai-top h3{margin:0;font-size:18px}
      #ime-ai-row{display:flex;align-items:center;gap:10px;flex-wrap:wrap;margin-top:10px}
      #ime-ai-extra{display:flex;align-items:center;gap:12px;flex-wrap:wrap;margin-top:10px}
      #ime-ai-extra label{font:700 12px/1 Arial,sans-serif;color:#1f2937;display:inline-flex;align-items:center;gap:6px}
      #ime-ai-engine{padding:7px 8px;border:1px solid #d1d5db;border-radius:8px;background:#fff;font:700 12px/1 Arial,sans-serif}
      #ime-ai-blocks{margin-top:10px;padding:10px;border:1px solid #e5e7eb;border-radius:10px;background:#f8fafc}
      #ime-ai-blocks-head{display:flex;align-items:center;gap:10px;flex-wrap:wrap}
      #ime-ai-blocks-head label{font:700 12px/1 Arial,sans-serif;color:#1f2937;display:inline-flex;align-items:center;gap:6px}
      #ime-ai-mode,#ime-ai-block-type{padding:7px 8px;border:1px solid #d1d5db;border-radius:8px;background:#fff;font:700 12px/1 Arial,sans-serif}
      #ime-ai-block-clear{background:#b45309;padding:8px 12px}
      #ime-ai-block-detect{background:#0f766e;padding:8px 12px}
      #ime-ai-blocks-hint{margin-top:8px;font:700 11px/1.35 Arial,sans-serif;color:#475569}
      #ime-ai-block-form{display:grid;grid-template-columns:repeat(2,minmax(220px,1fr));gap:8px;margin-top:8px}
      .ime-ai-bf{display:flex;flex-direction:column;gap:4px}
      .ime-ai-bf label{font:700 11px/1 Arial,sans-serif;color:#374151}
      .ime-ai-bf input,.ime-ai-bf select,.ime-ai-bf textarea{border:1px solid #d1d5db;border-radius:8px;padding:7px 8px;font:600 12px/1.3 Arial,sans-serif;background:#fff}
      #ime-ai-instruction{width:100%;min-height:112px;font-size:15px;padding:12px;border:1px solid #ddd;border-radius:10px;margin-top:10px}
      .ime-a-btn{border:none;border-radius:10px;padding:10px 14px;cursor:pointer;font-weight:900;color:#fff}
      #ime-ai-send{background:#2563eb}#ime-ai-send-apply{background:#0369a1}#ime-ai-edit{background:#7c3aed}#ime-ai-ins{background:#16a34a;display:none}#ime-ai-close2{background:#6b7280}
      #ime-ai-mic{background:#be123c}
      #ime-ai-dict{background:#4b5563}
      #ime-ai-status{font-size:13px;color:#555;margin-top:8px;font-weight:800}
      #ime-ai-mic-live{font-size:12px;color:#1d4ed8;font-weight:700;margin-top:6px;min-height:16px}
      #ime-ai-preview-wrap{display:none;margin-top:12px}#ime-ai-preview{border:1px solid #16a34a;border-radius:12px;padding:12px;min-height:300px;background:#fbfffb}
      #ime-ai-qc{margin-top:8px;padding:8px;border:1px solid #e5e7eb;border-radius:10px;background:#f9fafb;font:700 12px/1.35 Arial,sans-serif}
      .ime-qc-critical{color:#b91c1c}
      .ime-qc-warning{color:#92400e}
      .ime-qc-info{color:#1e40af}
      .ime-qc-ok{color:#166534}
      mark.ime-uncertain{background:#fde68a;padding:0 2px;border-radius:3px}
      @media (max-width: 900px){#ime-ai-block-form{grid-template-columns:1fr}}
    `;
    document.head.appendChild(style);

    const dock = document.createElement('div');
    dock.id = 'ime-dock';
    dock.innerHTML = `
      <div id="ime-prof"></div>
      <div id="ime-trames"><div style="padding:8px;color:#777">Chargement...</div></div>
      <div id="ime-billing">
        <div class="ime-head">Favoris Facturation</div>
        <div class="ime-tools">
          <button class="ime-mini" id="ime-billing-rec">● Rec</button>
          <button class="ime-mini" id="ime-billing-save" style="display:none">■ Enregistrer</button>
          <button class="ime-mini" id="ime-billing-export">Export JSON</button>
          <button class="ime-mini" id="ime-billing-import">Import JSON</button>
        </div>
        <div id="ime-billing-list"></div>
      </div>
      <div id="ime-ordos">
        <div class="ime-head">Ordonnances Flash</div>
        <div class="ime-tools">
          <button class="ime-mini" id="ime-ordo-add">Ajouter</button>
          <button class="ime-mini" id="ime-ordo-export">Export JSON</button>
          <button class="ime-mini" id="ime-ordo-import">Import JSON</button>
        </div>
        <div id="ime-ordos-list"></div>
      </div>
      <button class="ime-btn" id="ime-b-tr" title="Trames">📋</button>
      <button class="ime-btn" id="ime-b-cp" title="Copier CR + titre">💾</button>
      <button class="ime-btn" id="ime-b-pt" title="Coller CR + titre">📂</button>
      <button class="ime-btn" id="ime-b-bi" title="Facturation">🧾</button>
      <button class="ime-btn" id="ime-b-bq" title="Facturation rapide">⚡</button>
      <button class="ime-btn" id="ime-b-or" title="Ordonnances">💊</button>
      <button class="ime-btn" id="ime-b-ai" title="Assistant IA">🎙️</button>
      <button class="ime-btn" id="ime-b-dc" title="Dernier CR + MAJ">🕘</button>
    `;
    document.body.appendChild(dock);

    const overlay = document.createElement('div');
    overlay.id = 'ime-ai-overlay';
    overlay.innerHTML = `
      <div id="ime-ai-modal" role="dialog" aria-modal="true">
        <div id="ime-ai-top"><h3>Assistant IA - Suite Unifiee</h3><button id="ime-ai-x" class="ime-a-btn" style="background:#111827">Fermer</button></div>
        <div id="ime-ai-row">
          <select id="ime-ai-salutation"><option value="Cher Confrere,">Cher Confrere,</option><option value="Chere Consœur,">Chere Consœur,</option><option value="Cher confrere,">Cher confrere,</option><option value="Chere consœur,">Chere consœur,</option></select>
          <button class="ime-a-btn" id="ime-ai-mic">🎤 Dicter</button>
          <button class="ime-a-btn" id="ime-ai-send">Generer CR</button>
          <button class="ime-a-btn" id="ime-ai-send-apply">Generer + Appliquer</button>
          <button class="ime-a-btn" id="ime-ai-edit">Ajuster CR</button>
          <button class="ime-a-btn" id="ime-ai-reopen" style="background:#0891b2">Dernier</button>
          <button class="ime-a-btn" id="ime-ai-ins">Appliquer</button>
          <button class="ime-a-btn" id="ime-ai-dict">Dico</button>
          <button class="ime-a-btn" id="ime-ai-close2">Fermer</button>
        </div>
        <div id="ime-ai-extra">
          <label>Moteur micro:
            <select id="ime-ai-engine">
              <option value="browser">Navigateur</option>
              <option value="openai">OpenAI Audio</option>
            </select>
          </label>
          <label><input type="checkbox" id="ime-ai-filter" checked>Mode anti-bruit (ignore les paroles non medicales)</label>
          <label><input type="checkbox" id="ime-ai-uncertain" checked>Surligner incertitudes (preview)</label>
        </div>
        <div id="ime-ai-blocks">
          <div id="ime-ai-blocks-head">
            <label>Mode:
              <select id="ime-ai-mode">
                <option value="hybride">Hybride blocs + dictee</option>
                <option value="dictee">Dictee seule</option>
                <option value="blocs">Blocs (avec notes optionnelles)</option>
              </select>
            </label>
            <label>Type blocs:
              <select id="ime-ai-block-type">
                <option value="auto">Auto (sans blocs)</option>
                <option value="arteriel_complet">Arteriel complet</option>
                <option value="arteriel_mi">Arteriel MI</option>
                <option value="arterio_veineux_complet">Arteriel + veineux complet</option>
                <option value="arterio_veineux_mi">Arteriel + veineux MI</option>
                <option value="veineux_superficiel">Veineux superficiel</option>
                <option value="urgence_tvp">Urgence TVP</option>
                <option value="tsao">TSAo</option>
                <option value="renales">Arteres renales</option>
                <option value="capillaroscopie">Capillaroscopie</option>
                <option value="sclerose">Sclerose</option>
                <option value="laser_operatoire">Laser operatoire</option>
                <option value="fav_creation">Creation FAV</option>
                <option value="fav_bilan">Bilan FAV</option>
              </select>
            </label>
            <button class="ime-a-btn" id="ime-ai-block-detect">Detecter</button>
            <button class="ime-a-btn" id="ime-ai-block-clear">Vider blocs</button>
          </div>
          <div id="ime-ai-blocks-hint"></div>
          <div id="ime-ai-block-form"></div>
        </div>
        <textarea id="ime-ai-instruction" placeholder="Dictez avec 🎤 Dicter ou collez votre texte clinique ici..."></textarea>
        <div id="ime-ai-mic-live"></div>
        <div id="ime-ai-status"></div>
        <div id="ime-ai-qc"></div>
        <div id="ime-ai-preview-wrap"><div style="margin:10px 0;font-weight:900;color:#16a34a">Resultat</div><div id="ime-ai-preview" contenteditable="true"></div></div>
      </div>
    `;
    document.body.appendChild(overlay);

    const hidePanels = () => {
      ['ime-trames', 'ime-billing', 'ime-ordos'].forEach((id) => {
        const el = document.getElementById(id);
        if (el) el.style.display = 'none';
      });
    };
    const togglePanel = (id, onOpen) => {
      const el = document.getElementById(id);
      if (!el) return;
      const show = el.style.display !== 'block';
      hidePanels();
      el.style.display = show ? 'block' : 'none';
      if (show && typeof onOpen === 'function') onOpen();
    };

    const outsideDocsBound = new WeakSet();
    const bindOutsideCloseOnDoc = (doc, isTopDoc) => {
      if (!doc || outsideDocsBound.has(doc)) return;
      const onDown = (ev) => {
        const d = document.getElementById('ime-dock');
        if (!d) return;
        const t = ev && ev.target;
        if (isTopDoc && t && d.contains(t)) return;
        hidePanels();
      };
      try { doc.addEventListener('pointerdown', onDown, true); } catch (e) {}
      try { doc.addEventListener('mousedown', onDown, true); } catch (e) {}
      outsideDocsBound.add(doc);
    };

    const hookFrameLoad = (fr) => {
      if (!fr || fr.__imeOutsideHooked) return;
      fr.__imeOutsideHooked = true;
      try { fr.addEventListener('load', () => bindOutsideCloseEverywhere(), true); } catch (e) {}
    };

    const bindOutsideCloseEverywhere = () => {
      bindOutsideCloseOnDoc(document, true);
      const stack = Array.from(document.querySelectorAll('iframe'));
      while (stack.length) {
        const fr = stack.pop();
        if (!fr) continue;
        hookFrameLoad(fr);
        try {
          const fd = fr.contentDocument;
          if (!fd) continue;
          bindOutsideCloseOnDoc(fd, false);
          Array.from(fd.querySelectorAll('iframe')).forEach((sub) => stack.push(sub));
        } catch (e) {}
      }
    };
    bindOutsideCloseEverywhere();
    try {
      const mo = new MutationObserver(() => bindOutsideCloseEverywhere());
      mo.observe(document.documentElement || document.body, { childList: true, subtree: true });
    } catch (e) {}

    document.getElementById('ime-b-tr').onclick = () => togglePanel('ime-trames', () => fetchTrames());
    document.getElementById('ime-b-cp').onclick = doCopy;
    document.getElementById('ime-b-pt').onclick = doPaste;
    document.getElementById('ime-b-bi').onclick = (ev) => {
      if (isPatientCRPage() && ev && ev.altKey) {
        runQuickBillingFromCR(ev.currentTarget).catch((e) => alert(`Erreur facturation rapide: ${e?.message || e}`));
        return;
      }
      togglePanel('ime-billing', () => renderBillingFavs());
    };
    document.getElementById('ime-b-bq').onclick = (ev) => runQuickBillingFromCR(ev && ev.currentTarget).catch((e) => alert(`Erreur facturation rapide: ${e?.message || e}`));
    document.getElementById('ime-b-or').onclick = () => togglePanel('ime-ordos', () => renderOrdos());
    document.getElementById('ime-b-ai').onclick = () => openAI();
    document.getElementById('ime-b-dc').onclick = runDernierCRMaj;
    const profBtn = document.getElementById('ime-prof');
    if (profBtn) {
      profBtn.title = 'Gestion profils et sync cloud';
      profBtn.style.cursor = 'pointer';
      profBtn.onclick = () => profileBadgeMenu().catch((e) => alert(`Erreur profil: ${e?.message || e}`));
    }

    document.getElementById('ime-billing-export').onclick = async () => {
      try {
        const txt = JSON.stringify(profile().billingFavs || [], null, 2);
        await navigator.clipboard.writeText(txt);
        alert('Favoris facturation exportes dans le presse-papiers.');
      } catch (e) {
        prompt('Copie le JSON :', JSON.stringify(profile().billingFavs || [], null, 2));
      }
    };
    document.getElementById('ime-billing-import').onclick = () => {
      const txt = prompt('Colle le JSON des favoris facturation :');
      if (!txt) return;
      try {
        const arr = JSON.parse(txt);
        if (!Array.isArray(arr)) throw new Error('format');
        profile().billingFavs = arr;
        saveState();
        scheduleBillingPush();
        scheduleProfilesPush();
        renderBillingFavs();
      } catch (e) {
        alert('Import facturation invalide.');
      }
    };
    document.getElementById('ime-billing-rec').onclick = async () => {
      const recBtn = document.getElementById('ime-billing-rec');
      const saveBtn = document.getElementById('ime-billing-save');
      if (billingRecorder.active) return;
      const ok = await billingRecorder.start();
      if (!ok) return;
      if (recBtn) recBtn.style.display = 'none';
      if (saveBtn) saveBtn.style.display = 'inline-flex';
      alert('Enregistrement lance. Realise la cotation dans la fenetre facturation, puis clique sur "Enregistrer".');
    };
    document.getElementById('ime-billing-save').onclick = async () => {
      const recBtn = document.getElementById('ime-billing-rec');
      const saveBtn = document.getElementById('ime-billing-save');
      try {
        await billingRecorder.stopAndSave();
      } finally {
        billingRecorder.detach();
        if (recBtn) recBtn.style.display = 'inline-flex';
        if (saveBtn) saveBtn.style.display = 'none';
      }
    };

    document.getElementById('ime-ordo-add').onclick = () => {
      const p0 = profile();
      const title = prompt('Titre ordonnance :', '');
      if (!title || !String(title).trim()) return;
      const html = prompt('HTML ordonnance :', '<p><strong></strong></p>');
      if (html === null) return;
      p0.ordos.push({ title: String(title).trim(), html: String(html || '') });
      saveState();
      scheduleOrdosPush();
      scheduleProfilesPush();
      renderOrdos();
    };
    document.getElementById('ime-ordo-export').onclick = async () => {
      try {
        const txt = JSON.stringify(profile().ordos || [], null, 2);
        await navigator.clipboard.writeText(txt);
        alert('Ordonnances exportees dans le presse-papiers.');
      } catch (e) {
        prompt('Copie le JSON :', JSON.stringify(profile().ordos || [], null, 2));
      }
    };
    document.getElementById('ime-ordo-import').onclick = () => {
      const txt = prompt('Colle le JSON des ordonnances :');
      if (!txt) return;
      try {
        const arr = JSON.parse(txt);
        if (!Array.isArray(arr)) throw new Error('format');
        profile().ordos = arr;
        saveState();
        scheduleOrdosPush();
        scheduleProfilesPush();
        renderOrdos();
      } catch (e) {
        alert('Import ordonnances invalide.');
      }
    };

    const close = () => closeAI();
    overlay.addEventListener('click', (e) => { if (e.target === overlay) close(); });
    document.getElementById('ime-ai-x').onclick = close;
    document.getElementById('ime-ai-close2').onclick = close;
    document.getElementById('ime-ai-send').onclick = () => aiGenerate(false);
    document.getElementById('ime-ai-send-apply').onclick = () => aiGenerate(false, { autoApply: true });
    document.getElementById('ime-ai-edit').onclick = () => aiGenerate(true);
    document.getElementById('ime-ai-ins').onclick = insertAI;
    document.getElementById('ime-ai-mic').onclick = () => {
      if (Date.now() < sttIgnoreClickUntil) return;
      toggleDictation();
    };
    document.getElementById('ime-ai-dict').onclick = menuEditDictionary;
    document.getElementById('ime-ai-engine').onchange = () => {
      const p = profile();
      p.sttEngine = String(document.getElementById('ime-ai-engine').value || DEFAULT_STT_ENGINE);
      saveState();
      scheduleProfilesPush();
      updateMicControls();
    };
    document.getElementById('ime-ai-filter').onchange = () => {
      const p = profile();
      p.sttFilter = !!document.getElementById('ime-ai-filter').checked;
      saveState();
      scheduleProfilesPush();
    };
    document.getElementById('ime-ai-uncertain').onchange = () => {
      const p = profile();
      p.uncertaintyOn = !!document.getElementById('ime-ai-uncertain').checked;
      saveState();
      scheduleProfilesPush();
      const box = document.getElementById('ime-ai-preview');
      if (box && LAST_AI_HTML_RAW) box.innerHTML = p.uncertaintyOn ? highlightUncertaintyHtml(LAST_AI_HTML_RAW) : LAST_AI_HTML_RAW;
    };
    document.getElementById('ime-ai-mode').onchange = () => {
      const p = profile();
      p.aiMode = clampAIMode(document.getElementById('ime-ai-mode').value || 'hybride');
      saveState();
      scheduleProfilesPush();
      updateAIBlocksHint();
    };
    document.getElementById('ime-ai-block-type').onchange = () => {
      const p = profile();
      const t = String(document.getElementById('ime-ai-block-type').value || 'auto').toLowerCase();
      p.aiBlockType = AI_BLOCK_SCHEMAS[t] ? t : 'auto';
      if (!p.aiBlockData || typeof p.aiBlockData !== 'object') p.aiBlockData = {};
      if (!p.aiBlockData[p.aiBlockType] || typeof p.aiBlockData[p.aiBlockType] !== 'object') p.aiBlockData[p.aiBlockType] = {};
      saveState();
      scheduleProfilesPush();
      renderAIBlockForm();
    };
    document.getElementById('ime-ai-block-detect').onclick = () => {
      const t = applySuggestedBlockTypeToUI(true);
      const n = prefillAIBlockDataFromCurrentCR(t);
      if (n > 0) {
        renderAIBlockForm();
        aiStatus(`Bloc detecte: ${getAIBlockSchema(t).label}. ${n} champ(s) pre-rempli(s) depuis le CR.`);
      } else {
        aiStatus(`Bloc detecte: ${getAIBlockSchema(t).label}.`);
      }
    };
    document.getElementById('ime-ai-block-clear').onclick = clearAIBlockFormData;
    const micBtn = document.getElementById('ime-ai-mic');
    const pttStart = (ev) => {
      if (!ev) return;
      ev.preventDefault();
      sttPressed = true;
      if (!sttRunning) startDictation();
    };
    const pttStop = (ev) => {
      if (!sttPressed) return;
      sttPressed = false;
      sttIgnoreClickUntil = Date.now() + 250;
      if (sttRunning || sttWantRun) stopDictation(false);
    };
    micBtn.addEventListener('pointerdown', pttStart);
    micBtn.addEventListener('pointerup', pttStop);
    micBtn.addEventListener('pointerleave', pttStop);
    micBtn.addEventListener('pointercancel', pttStop);
    document.getElementById('ime-ai-reopen').onclick = () => {
      const p = profile();
      const h = p.lastHtml || '';
      if (!h) return alert('Rien a reouvrir.');
      LAST_AI_HTML_RAW = h;
      document.getElementById('ime-ai-preview').innerHTML = p.uncertaintyOn ? highlightUncertaintyHtml(h) : h;
      aiQcRender(buildClinicalQC(h, inferExamTypeFromContent(h, '')));
      document.getElementById('ime-ai-preview-wrap').style.display = 'block';
      document.getElementById('ime-ai-ins').style.display = 'inline-block';
    };

    document.addEventListener('keydown', (e) => {
      if (e.altKey && (e.key === 'm' || e.key === 'M')) {
        openAI();
        return;
      }
      if (e.key === 'F8') {
        const ov = document.getElementById('ime-ai-overlay');
        if (!ov || ov.style.display !== 'flex') return;
        if (e.repeat) return;
        e.preventDefault();
        if (!sttRunning) startDictation();
      }
    });
    document.addEventListener('keyup', (e) => {
      if (e.key !== 'F8') return;
      const ov = document.getElementById('ime-ai-overlay');
      if (!ov || ov.style.display !== 'flex') return;
      e.preventDefault();
      if (sttRunning || sttWantRun) stopDictation(false);
    });
    updateMicControls();
    applyAIBlocksProfileToUI();
    renderBillingFavs();
    renderOrdos();
  }

  function renderTrames() {
    const wrap = document.getElementById('ime-trames');
    if (!wrap) return;
    wrap.innerHTML = '';
    const keys = Object.keys(TRAMES).sort();
    if (!keys.length) {
      wrap.innerHTML = '<div style="padding:10px;color:#777">Aucune trame Sergent trouvee.</div>';
      return;
    }
    keys.forEach((k) => {
      const b = document.createElement('button');
      b.className = 'ime-trame';
      b.textContent = k;
      b.onclick = () => { fetchTrameAndInject(TRAMES[k], k); wrap.style.display = 'none'; };
      wrap.appendChild(b);
    });
  }

  function refreshDock() {
    const d = document.getElementById('ime-dock');
    if (!d) return;
    const classic = isClassicPatientPage();
    const onCR = isPatientCRPage();
    const visible = classic || onCR;
    d.style.display = visible ? 'flex' : 'none';

    const p = profile();
    const badge = document.getElementById('ime-prof');
    if (badge) badge.textContent = `Profil: ${p.name}`;

    const bTr = document.getElementById('ime-b-tr');
    const bCp = document.getElementById('ime-b-cp');
    const bPt = document.getElementById('ime-b-pt');
    const bBi = document.getElementById('ime-b-bi');
    const bBq = document.getElementById('ime-b-bq');
    const bOr = document.getElementById('ime-b-or');
    const bAi = document.getElementById('ime-b-ai');
    const bDc = document.getElementById('ime-b-dc');

    if (bTr) bTr.style.display = onCR ? 'inline-flex' : 'none';
    if (bCp) bCp.style.display = onCR ? 'inline-flex' : 'none';
    if (bPt) bPt.style.display = onCR && p.clip && p.clip.html ? 'inline-flex' : 'none';
    if (bBi) bBi.style.display = visible ? 'inline-flex' : 'none';
    if (bBi) bBi.title = onCR ? 'Facturation (Alt+clic: rapide)' : 'Facturation';
    if (bBq) bBq.style.display = 'none';
    if (bOr) bOr.style.display = visible ? 'inline-flex' : 'none';
    if (bAi) bAi.style.display = onCR ? 'inline-flex' : 'none';
    if (bDc) bDc.style.display = onCR ? 'inline-flex' : 'none';

    if (!visible || !onCR) {
      const tramesPanel = document.getElementById('ime-trames');
      if (tramesPanel) tramesPanel.style.display = 'none';
    }
    if (!visible) {
      const billingPanel = document.getElementById('ime-billing');
      const ordosPanel = document.getElementById('ime-ordos');
      if (billingPanel) billingPanel.style.display = 'none';
      if (ordosPanel) ordosPanel.style.display = 'none';
    }
  }

  async function profileBadgeMenu() {
    const p = profile();
    const raw = prompt(
`Profil actif: ${p.name}
1. Changer profil
2. Creer profil
3. Renommer profil
4. Cle API OpenAI
5. Push cloud profils
6. Pull cloud profils
7. Push cloud tout
8. Pull cloud tout
9. Mot-cle trames (profil)
10. Infos sync cloud
11. Dictionnaire medical (profil)
12. Reglages micro IA
13. Echographes (profil)
14. Favori facturation rapide (profil)

Numero:`, '1');
    if (raw === null) return;
    const n = parseInt(raw, 10);
    if (Number.isNaN(n)) return;
    if (n === 1) menuChooseProfile();
    else if (n === 2) menuCreateProfile();
    else if (n === 3) menuRenameProfile();
    else if (n === 4) menuSetKey();
    else if (n === 5) {
      try { await profilesDrivePush(); alert('Push profils OK'); } catch (e) { alert(`Erreur push profils: ${e?.message || e}`); }
    } else if (n === 6) {
      try {
        const ok = await profilesDrivePull(true);
        if (ok) { refreshDock(); renderBillingFavs(); renderOrdos(); alert('Pull profils OK'); }
        else alert('Aucune donnee profils cloud.');
      } catch (e) { alert(`Erreur pull profils: ${e?.message || e}`); }
    } else if (n === 7) {
      try {
        await profilesDrivePush();
        if (USE_LEGACY_SHARED_CHANNELS) {
          if (p.drive?.billingOn) await billingDrivePutAll(p.billingFavs || []);
          if (p.drive?.ordosOn) await ordosDrivePutAll(p.ordos || [], DRIVE_ORDOS_NS);
          alert('Push cloud complet OK (legacy partage actif)');
        } else {
          alert('Push cloud complet OK (mode profils isole)');
        }
      } catch (e) { alert(`Erreur push cloud: ${e?.message || e}`); }
    } else if (n === 8) {
      try {
        await syncPullIfRemoteNewer();
        alert('Pull cloud complet OK');
      } catch (e) { alert(`Erreur pull cloud: ${e?.message || e}`); }
    } else if (n === 9) {
      menuSetTrameKeyword();
    } else if (n === 10) {
      menuCloudInfo();
    } else if (n === 11) {
      menuEditDictionary();
    } else if (n === 12) {
      menuSetSpeechConfig();
    } else if (n === 13) {
      menuSetEchographs();
    } else if (n === 14) {
      menuSetQuickBillingFavorite();
    }
  }

  function menuSetKey() {
    const p = profile();
    const k = prompt(`Cle OpenAI pour profil ${p.name}:`, p.key || '');
    if (k === null) return;
    const v = String(k).trim();
    if (!v || v.startsWith('sk-') || v.startsWith('ssk-')) { p.key = v; saveState(); scheduleProfilesPush(); return; }
    alert('Cle invalide.');
  }

  function menuSetModel() {
    const p = profile();
    const m = prompt(`Modele IA pour ${p.name}:`, p.model || DEFAULT_MODEL);
    if (m === null) return;
    const v = String(m).trim();
    if (!v) return alert('Modele invalide.');
    p.model = v;
    saveState();
    scheduleProfilesPush();
  }

  function menuEditDictionary() {
    const p = profile();
    const txt = prompt(
`Dictionnaire personnel (${p.name})
Format: terme=remplacement
Ex:
ith=ITB
fop=foramen ovale permeable
`,
      p.dictRaw || ''
    );
    if (txt === null) return;
    p.dictRaw = String(txt || '');
    saveState();
    scheduleProfilesPush();
  }

  function menuSetSpeechConfig() {
    const p = profile();
    const raw = prompt(
`Reglages micro IA (format: engine|lang|model)
engine: browser ou openai
Ex: openai|fr-FR|gpt-4o-mini-transcribe`,
      `${p.sttEngine || DEFAULT_STT_ENGINE}|${p.sttLang || DEFAULT_STT_LANG}|${p.sttModel || DEFAULT_STT_MODEL}`
    );
    if (raw === null) return;
    const parts = String(raw).split('|').map((x) => String(x || '').trim());
    const engine = (parts[0] || '').toLowerCase();
    const lang = parts[1] || DEFAULT_STT_LANG;
    const model = parts[2] || DEFAULT_STT_MODEL;
    if (engine !== 'browser' && engine !== 'openai') return alert('Engine invalide: browser/openai');
    p.sttEngine = engine;
    p.sttLang = lang;
    p.sttModel = model;
    saveState();
    scheduleProfilesPush();
  }

  function menuSetTrameKeyword() {
    const p = profile();
    const raw = prompt(`Mot-cle trames pour ${p.name} (plusieurs possibles separes par virgule) :`, p.trameKeyword || DEFAULT_TRAME_KEYWORD);
    if (raw === null) return;
    const v = String(raw).trim();
    p.trameKeyword = v || DEFAULT_TRAME_KEYWORD;
    saveState();
    scheduleProfilesPush();
    fetchTrames();
    alert(`Mot-cle trames actif: ${p.trameKeyword}`);
  }

  function menuSetEchographs() {
    const p = profile();
    p.echographs = normalizeEchographOptions(p.echographs);
    const raw = prompt(
      `Echographes pour ${p.name} (un par ligne ou separes par virgule).\nUn seul echographe sera selectionnable par compte-rendu.`,
      (p.echographs || []).join('\n')
    );
    if (raw === null) return;
    const arr = String(raw)
      .split(/\r?\n|,/)
      .map((x) => String(x || '').trim())
      .filter(Boolean);
    if (!arr.length) return alert('Liste vide.');
    p.echographs = normalizeEchographOptions(arr);
    saveState();
    scheduleProfilesPush();
    renderAIBlockForm();
    alert(`Echographes actifs (${p.echographs.length}) mis a jour.`);
  }

  function menuSetQuickBillingFavorite() {
    const p = profile();
    const favs = Array.isArray(p.billingFavs) ? p.billingFavs : [];
    if (!favs.length) return alert('Aucun favori facturation configure.');
    const cur = Number.isFinite(p.quickBillingFavIdx) ? Math.floor(p.quickBillingFavIdx) : 0;
    const txt = favs.map((f, i) => `${i + 1}. ${String(f?.label || `Favori ${i + 1}`)}${i === cur ? ' (actif)' : ''}`).join('\n');
    const raw = prompt(`Choisir le favori de facturation rapide:\n${txt}\n\nNumero:`, String(Math.min(cur + 1, favs.length)));
    if (raw === null) return;
    const n = parseInt(raw, 10);
    if (Number.isNaN(n) || n < 1 || n > favs.length) return alert('Selection invalide.');
    p.quickBillingFavIdx = n - 1;
    saveState();
    scheduleProfilesPush();
    alert(`Favori rapide actif: ${favs[p.quickBillingFavIdx]?.label || `Favori ${n}`}`);
  }

  function maskSecret(v) {
    const s = String(v || '');
    if (!s) return '';
    if (s.length <= 8) return '*'.repeat(s.length);
    return `${s.slice(0, 4)}...${s.slice(-4)}`;
  }

  function buildCloudInfoText(includeSecrets) {
    const p = profile();
    ensureStateSchema(STATE);
    const show = !!includeSecrets;
    const billingKey = show ? DRIVE_BILLING_KEY : maskSecret(DRIVE_BILLING_KEY);
    const ordosKey = show ? DRIVE_ORDOS_KEY : maskSecret(DRIVE_ORDOS_KEY);
    const localSyncTs = Number(STATE.sync?.localTs) || 0;
    const profilesRemoteTs = Number(STATE.sync?.profilesRemoteTs) || 0;
    const fmt = (ts) => ts ? new Date(ts).toISOString() : '0';
    return [
      `Profil actif: ${p.name}`,
      `Mode sync profils isole: ${USE_LEGACY_SHARED_CHANNELS ? 'non (legacy partage active)' : 'oui'}`,
      `Drive billing actif: ${p.drive?.billingOn ? 'oui' : 'non'} | rev local: ${Number(p.drive?.billingRev) || 0}`,
      `Drive ordos actif: ${p.drive?.ordosOn ? 'oui' : 'non'} | rev local: ${Number(p.drive?.ordosRev) || 0}`,
      `Favori facturation rapide index: ${Number.isFinite(p.quickBillingFavIdx) ? p.quickBillingFavIdx : 0}`,
      `STT engine: ${p.sttEngine || DEFAULT_STT_ENGINE} | STT model: ${p.sttModel || DEFAULT_STT_MODEL} | filtre: ${p.sttFilter ? 'on' : 'off'}`,
      `Echographes profil (${(p.echographs || []).length}): ${(normalizeEchographOptions(p.echographs).join(' | '))}`,
      `IA mode: ${p.aiMode || 'hybride'} | IA blocs: ${p.aiBlockType || 'auto'}`,
      `Mode incertitudes: ${p.uncertaintyOn ? 'on' : 'off'} | Dico perso: ${parseDictPairs(p.dictRaw || '').length} regles`,
      `sync.localTs: ${localSyncTs} (${fmt(localSyncTs)})`,
      `sync.profilesRemoteTs: ${profilesRemoteTs} (${fmt(profilesRemoteTs)})`,
      '',
      `Billing WebApp URL: ${DRIVE_BILLING_URL}`,
      `Billing Key: ${billingKey}`,
      '',
      `Ordos/Profils WebApp URL: ${DRIVE_ORDOS_URL}`,
      `Ordos Key: ${ordosKey}`,
      `Namespace ordonnances: ${DRIVE_ORDOS_NS}`,
      `Namespace profils: ${DRIVE_PROFILES_NS}`,
      '',
      `Pull cloud interval: ${DRIVE_POLL_MS} ms`,
      `Push debounce: ${DRIVE_PUSH_DEBOUNCE_MS} ms`,
      `Stockage local navigateur: localStorage['${APP_KEY}']`
    ].join('\n');
  }

  function menuCloudInfo() {
    const show = confirm('Afficher les cles cloud en clair ? (Annuler = masquees)');
    const txt = buildCloudInfoText(show);
    try { navigator.clipboard.writeText(txt); } catch (e) {}
    prompt('Infos sync cloud (copier/modifier):', txt);
  }

  function menuChooseProfile() {
    const ids = Object.keys(STATE.profiles);
    if (!ids.length) return;
    const txt = ids.map((id, i) => `${i + 1}. ${STATE.profiles[id].name}${id === STATE.activeId ? ' (actif)' : ''}`).join('\n');
    const raw = prompt(`Choisir profil:\n${txt}\n\nNumero:`, '1');
    if (raw === null) return;
    const n = parseInt(raw, 10);
    if (Number.isNaN(n) || n < 1 || n > ids.length) return alert('Selection invalide.');
    STATE.activeId = ids[n - 1];
    saveState();
    scheduleProfilesPush();
    refreshDock();
  }

  function menuCreateProfile() {
    const n = prompt('Nom du nouveau profil:', '');
    if (n === null || !String(n).trim()) return;
    const p = profile();
    const np = mkProfile(String(n).trim());
    np.model = p.model;
    np.trameKeyword = p.trameKeyword || DEFAULT_TRAME_KEYWORD;
    np.sttEngine = p.sttEngine || DEFAULT_STT_ENGINE;
    np.sttModel = p.sttModel || DEFAULT_STT_MODEL;
    np.sttLang = p.sttLang || DEFAULT_STT_LANG;
    np.sttFilter = typeof p.sttFilter === 'boolean' ? p.sttFilter : true;
    np.echographs = normalizeEchographOptions(p.echographs || DEFAULT_ECHOGRAPH_OPTIONS);
    np.quickBillingFavIdx = Number.isFinite(p.quickBillingFavIdx) ? Math.max(0, Math.floor(Number(p.quickBillingFavIdx) || 0)) : 0;
    np.uncertaintyOn = typeof p.uncertaintyOn === 'boolean' ? p.uncertaintyOn : true;
    np.dictRaw = p.dictRaw || '';
    np.aiMode = p.aiMode || 'hybride';
    np.aiBlockType = p.aiBlockType || 'auto';
    np.aiBlockData = clone(p.aiBlockData || {});
    np.salutation = p.salutation;
    np.billingFavs = clone(p.billingFavs || DEFAULT_BILLING_FAVS);
    np.ordos = clone(p.ordos || DEFAULT_ORDOS);
    STATE.profiles[np.id] = np;
    STATE.activeId = np.id;
    saveState();
    scheduleProfilesPush();
    refreshDock();
  }

  function menuRenameProfile() {
    const p = profile();
    const n = prompt('Nouveau nom du profil actif:', p.name || '');
    if (n === null || !String(n).trim()) return;
    p.name = String(n).trim();
    saveState();
    scheduleProfilesPush();
    refreshDock();
  }

  function menuDeleteProfile() {
    const ids = Object.keys(STATE.profiles);
    if (ids.length <= 1) return alert('Au moins un profil doit rester.');
    const p = profile();
    if (!confirm(`Supprimer profil ${p.name} ?`)) return;
    delete STATE.profiles[p.id];
    STATE.activeId = Object.keys(STATE.profiles)[0];
    saveState();
    scheduleProfilesPush();
    refreshDock();
  }

  function registerMenus() {
    GM_registerMenuCommand('iMonEcho Suite - Changer profil', menuChooseProfile);
    GM_registerMenuCommand('iMonEcho Suite - Creer profil', menuCreateProfile);
    GM_registerMenuCommand('iMonEcho Suite - Renommer profil', menuRenameProfile);
    GM_registerMenuCommand('iMonEcho Suite - Supprimer profil', menuDeleteProfile);
    GM_registerMenuCommand('iMonEcho Suite - Definir cle OpenAI', menuSetKey);
    GM_registerMenuCommand('iMonEcho Suite - Definir modele IA', menuSetModel);
    GM_registerMenuCommand('iMonEcho Suite - Dictionnaire medical (profil actif)', menuEditDictionary);
    GM_registerMenuCommand('iMonEcho Suite - Reglages micro IA (profil actif)', menuSetSpeechConfig);
    GM_registerMenuCommand('iMonEcho Suite - Definir mot-cle trames (profil actif)', menuSetTrameKeyword);
    GM_registerMenuCommand('iMonEcho Suite - Definir echographes (profil actif)', menuSetEchographs);
    GM_registerMenuCommand('iMonEcho Suite - Definir favori facturation rapide (profil actif)', menuSetQuickBillingFavorite);
    GM_registerMenuCommand('iMonEcho Suite - Infos sync cloud', menuCloudInfo);
    GM_registerMenuCommand('iMonEcho Suite - Reset favoris facturation (profil actif)', () => {
      if (!confirm('Recharger les favoris facturation par defaut pour ce profil ?')) return;
      const p = profile();
      p.billingFavs = clone(DEFAULT_BILLING_FAVS);
      saveState();
      scheduleProfilesPush();
      renderBillingFavs();
      alert('Favoris facturation recharges.');
    });
    GM_registerMenuCommand('iMonEcho Suite - Reset ordonnances (profil actif)', () => {
      if (!confirm('Recharger les ordonnances par defaut pour ce profil ?')) return;
      const p = profile();
      p.ordos = clone(DEFAULT_ORDOS);
      saveState();
      scheduleProfilesPush();
      renderOrdos();
      alert('Ordonnances rechargees.');
    });
  }

  function tick() {
    refreshDock();
    const pid = getPatientID();
    if (pid && pid !== LAST_PID) { LAST_PID = pid; fetchTrames(); }
    if (!pid) LAST_PID = null;
  }

  function init() {
    firstRunSetup();
    registerMenus();
    mountUI();
    tick();
    setTimeout(() => { syncPullIfRemoteNewer().catch(() => {}); }, 700);
    setInterval(() => { syncPullIfRemoteNewer().catch(() => {}); }, DRIVE_POLL_MS);
    setInterval(tick, 950);
  }

  if (document.readyState === 'complete') init();
  else window.addEventListener('load', init);
})();
