from decimal import Decimal, ROUND_HALF_UP


class PricingService:
    @staticmethod
    def round_price(price: Decimal, decimals: int = 2) -> Decimal:
        quant = Decimal("1") if decimals <= 0 else Decimal("1." + "0" * decimals)
        return price.quantize(quant, rounding=ROUND_HALF_UP)

    @staticmethod
    def calculate_ebay_price(net_price: Decimal, fee_percentage: Decimal) -> Decimal:
        if fee_percentage >= Decimal("100"):
            raise ValueError("Fee percentage non valida")
        divisor = Decimal("1") - (fee_percentage / Decimal("100"))
        if divisor <= 0:
            raise ValueError("Fee percentage non valida")
        return PricingService.round_price(net_price / divisor)

    @staticmethod
    def calculate_net_from_gross(gross_price: Decimal, fee_percentage: Decimal) -> Decimal:
        fee_amount = PricingService.calculate_fee_amount(gross_price, fee_percentage)
        return PricingService.round_price(gross_price - fee_amount)

    @staticmethod
    def calculate_fee_amount(gross_price: Decimal, fee_percentage: Decimal) -> Decimal:
        return PricingService.round_price(gross_price * (fee_percentage / Decimal("100")))
