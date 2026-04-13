import { buildPantryItemPayload, estimateKcalPerPackage } from "@/utils/pantry";

describe("pantry helpers", () => {
  it("estimates calories from 100g nutrition data and package size", () => {
    const kcal = estimateKcalPerPackage({
      barcode: "1",
      name: "Caprese",
      brand: "Brand",
      quantity: "180 g",
      servingSize: null,
      imageUrl: null,
      productUrl: null,
      nutriScore: null,
      stores: null,
      storeTags: null,
      purchasePlaces: null,
      nutriments: { "energy-kcal_100g": 220 },
      nutriScoreData: null,
      rawProduct: null,
    });

    expect(kcal).toBe(396);
  });

  it("supports multi-pack liquid quantities against 100ml nutrition data", () => {
    const kcal = estimateKcalPerPackage({
      barcode: "2",
      name: "Juice",
      brand: "Brand",
      quantity: "2 x 500 ml",
      servingSize: null,
      imageUrl: null,
      productUrl: null,
      nutriScore: null,
      stores: null,
      storeTags: null,
      purchasePlaces: null,
      nutriments: { "energy-kcal_100ml": 45 },
      nutriScoreData: null,
      rawProduct: null,
    });

    expect(kcal).toBe(450);
  });

  it("falls back to serving calories when package size cannot be derived", () => {
    const kcal = estimateKcalPerPackage({
      barcode: "3",
      name: "Snack",
      brand: "Brand",
      quantity: null,
      servingSize: "1 bar",
      imageUrl: null,
      productUrl: null,
      nutriScore: null,
      stores: null,
      storeTags: null,
      purchasePlaces: null,
      nutriments: { "energy-kcal_serving": "123" },
      nutriScoreData: null,
      rawProduct: null,
    });

    expect(kcal).toBe(123);
  });

  it("builds a trimmed pantry payload from the product", () => {
    const payload = buildPantryItemPayload(
      {
        barcode: " 7613035974685 ",
        name: " Chocolate Bar ",
        brand: null,
        quantity: null,
        servingSize: null,
        imageUrl: null,
        productUrl: null,
        nutriScore: null,
        stores: null,
        storeTags: null,
        purchasePlaces: null,
        nutriments: null,
        nutriScoreData: null,
        rawProduct: null,
      },
      3,
      250,
    );

    expect(payload).toEqual({
      barcode: "7613035974685",
      name: "Chocolate Bar",
      quantity: 3,
      kcalPerPackage: 250,
    });
  });
});
