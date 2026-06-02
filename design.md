# Design Document

This website will eventually replace the new purchasing process website.

The purpose of this document is to outline the features needed to fully superseded the previous solution.

* Purchasing Process
  * Google Sheets backend
  * Only backend API calls, no direct calls
  * Caching where possible
  * Readable front end
  * Readable errors

* New Required features
  * No Google account sign in (slack sign in)
  * Duplicate previous requests
  * Suppliers/best practices list
    * Should be contained within the sheet and also be searchable like the chief delphi create post function
  * Admin panel for actions
  * Disagreement for purchases
  * Themes (dark/light mode)
  * No picker api and other browser support
  * Budget Integration into UI
    * Separate Module
  * Multiple items per request

Old required features
* Search
  * By name
  * By description
  * Filtering
    * State
    * Category
  * Sorting
* Groups of items
  * Groups should track shipping per group, not per item
  * Group views
* Approvals
  * May be changed over the offseason, so will revisit how it works
* Slack integration
  * Messages on change
  * Viewing/opening thread in Slack
* Creating requests
* Sign in
  * Caching of tokens

Optional Features
* Optional info display
