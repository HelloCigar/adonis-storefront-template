---
capability: sales-overview
---

# Sales Overview — State

## Requirements

### Compare sales with the previous period

- Given orders were captured in the period of the same length just before the selected range, when a staff member views sales on Home, then the sales chart shows that earlier period's sales alongside the selected range, each point matched to the point the same distance into the range.
- Given no sales were captured in the earlier period, when a staff member views sales on Home, then the comparison sits at zero and the selected range's sales still show.
- Given the staff member changes the date range or grouping, when the chart refreshes, then the comparison follows the new range and grouping.

### See each headline figure's trend

- Given sales, orders, or customer sign-ups across the selected range, when a staff member views sales on Home, then each headline figure shows how it moved across the range, point by point at the chosen grouping.
- Given a point in the range with no orders, when the average-order trend is shown, then that point sits at zero rather than breaking the trend.
- Given the staff member changes the range or grouping, when the figures refresh, then each trend follows the new range and grouping.
