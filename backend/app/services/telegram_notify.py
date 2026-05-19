from .notification_service import notification_service


def send_ebay_order_notification(ordine) -> None:
    notification_service.send_new_order_notification(ordine)
