---
capability: store-setup
---

# Store Setup — State

## Requirements

### Store setup is offered to admins

- Given store setup is unfinished, when an admin opens the dashboard, then store setup is offered to them.
- Given store setup is unfinished, when a staff member opens the dashboard, then they see neither store setup nor a prompt to resume it.
- Given store setup is finished, when an admin opens the dashboard, then store setup is not offered.

### Admins can skip store setup and resume later

- Given store setup is offered, when the admin skips it, then they reach the dashboard and a prompt to resume store setup is shown.
- Given store setup was skipped and is still unfinished, when any admin opens the dashboard, then the prompt to resume store setup is still shown.
- Given store setup is finished, when any admin opens the dashboard, then no prompt to resume store setup is shown.

### Store setup progress is saved per step and shared across admins

- Given an admin completes a store setup step with valid values, when they move on, then that step is saved and takes effect immediately.
- Given one admin saved some steps and left, when another admin opens store setup, then they resume at the first unfinished step and see the values already saved.
- Given two admins save the same step, when both saves complete, then the later save is the one that applies.
- Given a step has invalid values, when the admin tries to move on, then the step is not saved and the admin stays on it.

### Stores already running are offered store setup pre-filled

- Given a store was already running before store setup existed, when an admin opens the dashboard, then store setup is offered pre-filled with the store's current name, contact email, shipping fee, and any policies supplied with the deployment.

### Finishing store setup

- Given every store setup step is complete, when the admin finishes, then they land on the dashboard with the launch checklist, and store setup is never offered again to any admin.

### Launch checklist lists the remaining launch work

- Given store setup is finished and the checklist is not dismissed or complete, when an admin opens the dashboard, then they see three items: "Add a product shoppers can buy", "Invite a staff member", and "Write your store policies", each linking to the screen where that work is done.
- Given the launch checklist is showing, when a staff member opens the dashboard, then they do not see it.

### Launch checklist items tick themselves

- Given at least one product is available for sale, when an admin views the checklist, then "Add a product shoppers can buy" is ticked.
- Given an account other than the current admin has staff or admin access, when an admin views the checklist, then "Invite a staff member" is ticked.
- Given at least one policy is published, when an admin views the checklist, then "Write your store policies" is ticked.
- Given an item was ticked, when its condition later stops holding (for example, the only product for sale is archived), then the item stays ticked.
- Given a store already running when this ships, when its checklist first appears, then items whose conditions already hold are shown ticked.

### Launch checklist completes or is dismissed store-wide

- Given every checklist item is ticked, when any admin opens the dashboard, then the checklist is no longer shown.
- Given the checklist is showing, when any admin dismisses it, then it is hidden for every admin and never reappears.
