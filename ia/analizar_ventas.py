import base64
import io
import json
import sys
from itertools import combinations

import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
import numpy as np
import pandas as pd
from sklearn.linear_model import LinearRegression


def read_input():
    payload = json.load(sys.stdin)
    return payload if isinstance(payload, list) else []


def main():
    rows = read_input()
    frame = pd.DataFrame(rows)
    if frame.empty:
        print(json.dumps({"summary": {}, "products": [], "recommendations": [], "chart": None}))
        return

    frame["fecha"] = pd.to_datetime(frame["fecha"], errors="coerce")
    frame["cantidad"] = pd.to_numeric(frame["cantidad"], errors="coerce").fillna(0)
    frame["precio_unitario"] = pd.to_numeric(frame["precio_unitario"], errors="coerce").fillna(0)
    frame["subtotal"] = frame["cantidad"] * frame["precio_unitario"]
    frame = frame.dropna(subset=["fecha"])

    daily = frame.groupby(frame["fecha"].dt.date, as_index=False)["cantidad"].sum()
    daily["dia"] = np.arange(len(daily))
    prediction = None
    if len(daily) >= 2:
        model = LinearRegression().fit(daily[["dia"]], daily["cantidad"])
        next_day = np.array([[len(daily)]])
        prediction = max(0, round(float(model.predict(next_day)[0]), 2))

    products = (
        frame.groupby(["producto_id", "nombre_producto"], as_index=False)
        .agg(unidades=("cantidad", "sum"), ingresos=("subtotal", "sum"))
        .sort_values("unidades", ascending=False)
    )
    products["promedio_diario"] = products["unidades"] / max(len(daily), 1)
    products["demanda_estimada"] = np.ceil(products["promedio_diario"]).astype(int)

    baskets = frame.groupby("id_pedido")["nombre_producto"].apply(
        lambda values: sorted(set(str(value) for value in values if value))
    )
    pair_counts = {}
    for basket in baskets:
        for first, second in combinations(basket, 2):
            pair = " + ".join((first, second))
            pair_counts[pair] = pair_counts.get(pair, 0) + 1
    recommendations = [
        {"productos": pair, "compras_juntas": count}
        for pair, count in sorted(pair_counts.items(), key=lambda item: item[1], reverse=True)[:5]
    ]

    chart = None
    if len(daily) > 0:
        figure, axis = plt.subplots(figsize=(8, 3.5))
        axis.plot(daily["dia"], daily["cantidad"], marker="o", color="#0f4c45")
        axis.set_title("Unidades vendidas por día")
        axis.set_xlabel("Día")
        axis.set_ylabel("Unidades")
        axis.grid(alpha=0.2)
        figure.tight_layout()
        output = io.BytesIO()
        figure.savefig(output, format="png", dpi=120)
        plt.close(figure)
        chart = base64.b64encode(output.getvalue()).decode("ascii")

    print(json.dumps({
        "summary": {
            "pedidos_analizados": int(frame["id_pedido"].nunique()),
            "unidades_vendidas": int(frame["cantidad"].sum()),
            "ingresos": round(float(frame["subtotal"].sum()), 2),
            "promedio_diario": round(float(frame["cantidad"].sum() / max(len(daily), 1)), 2),
            "varianza_diaria": round(float(np.var(daily["cantidad"])), 2),
            "desviacion_estandar_diaria": round(float(np.std(daily["cantidad"])), 2),
            "demanda_manana": prediction,
        },
        "products": products.head(10).to_dict("records"),
        "recommendations": recommendations,
        "chart": chart,
    }, ensure_ascii=False))


if __name__ == "__main__":
    main()
