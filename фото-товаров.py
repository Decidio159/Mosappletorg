#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Официальные снимки производителей → assets/products/<id>-N.webp

Карта ниже — единственное место, где живут адреса первоисточников.
Скрипт скачивает, обрезает по краю товара, кладёт на подложку #f5f5f7
(ту же, на которой сняты рендеры) и вписывает список файлов в товары.json,
чтобы его не приходилось держать в голове.

    python фото-товаров.py

Ключ --только id1,id2 — перекачать отдельные товары.
"""

import argparse
import io
import json
import os
import sys
import urllib.request

from PIL import Image, ImageChops

for поток in (sys.stdout, sys.stderr):
    try:
        поток.reconfigure(encoding="utf-8")
    except (AttributeError, ValueError):
        pass

ФОН = (245, 245, 247)   # подложка рендеров Apple
БЕЛЫЙ = (255, 255, 255) # фон карточек и лент на сайте
# Размеры подобраны по факту вёрстки, а не «на всякий случай»: на странице
# товара снимок занимает не больше 560 CSS-пикселей, в каталоге — 280.
# Двойной запас на экраны с плотностью 2×, дальше растёт только вес.
СТОРОНА = 720          # страница товара
МИНИ = 400             # карточка в каталоге и лента на телефоне
КАЧЕСТВО = 68
ПАПКА = "assets/products"

A = "https://store.storeimages.cdn-apple.com/1/as-images.apple.com/is/%s?wid=1400&hei=1400&fmt=png-alpha"
D = "https://se-cdn.djiits.com/tpc/uploads/spu/cover/%s@origin.png"

# id товара → снимки по порядку: первый идёт в каталог, остальные в галерею
КАРТА = {
 "ip17pm": [A % "iphone-17-pro-finish-select-202509-6-9inch-deepblue",
                A % "iphone-17-pro-model-unselect-gallery-1-202509",
                A % "iphone-17-pro-model-unselect-gallery-2-202509",
                A % "iphone-17-pro-finish-select-202509-6-9inch-cosmicorange"],
 "ip16pm": [A % "iphone-16-pro-finish-select-202409-6-9inch-blacktitanium",
                A % "iphone-16-pro-model-unselect-gallery-1-202409",
                A % "iphone-16-pro-model-unselect-gallery-2-202409"],
 "ip16p":  [A % "iphone-16-pro-finish-select-202409-6-3inch-naturaltitanium",
                A % "iphone-16-pro-finish-select-202409-6-3inch-whitetitanium",
                A % "iphone-16-pro-model-unselect-gallery-1-202409",
                A % "iphone-16-pro-model-unselect-gallery-2-202409"],
 "ip16plus": [A % "iphone-16-finish-select-202409-6-7inch-ultramarine",
                  A % "iphone-16-model-unselect-gallery-1-202409",
                  A % "iphone-16-model-unselect-gallery-2-202409"],
 "ip16":   [A % "iphone-16-finish-select-202409-6-1inch-ultramarine",
                A % "iphone-16-finish-select-202409-6-1inch-teal",
                A % "iphone-16-finish-select-202409-6-1inch-pink",
                A % "iphone-16-model-unselect-gallery-1-202409"],
 "ip15p":  [A % "iphone-15-pro-finish-select-202309-6-1inch-naturaltitanium",
                A % "iphone-15-pro-finish-select-202309-6-1inch-bluetitanium",
                A % "iphone-15-pro-finish-select-202309-6-1inch-blacktitanium",
                A % "iphone-15-pro-model-unselect-gallery-1-202309"],
 "ip15plus": [A % "iphone-15-finish-select-202309-6-7inch-blue",
                  A % "iphone-15-model-unselect-gallery-1-202309",
                  A % "iphone-15-model-unselect-gallery-2-202309"],
 "ip15":   [A % "iphone-15-finish-select-202309-6-1inch-blue",
                A % "iphone-15-finish-select-202309-6-1inch-pink",
                A % "iphone-15-finish-select-202309-6-1inch-black",
                A % "iphone-15-model-unselect-gallery-1-202309"],
 "bu-16pm-512": [A % "iphone-16-pro-finish-select-202409-6-9inch-deserttitanium",
                 A % "iphone-16-pro-model-unselect-gallery-1-202409"],
 "bu-14pm-256": [A % "iphone-14-pro-finish-select-202209-6-7inch-deeppurple",
                 A % "iphone-14-pro-model-unselect-gallery-1-202209",
                 A % "iphone-14-pro-model-unselect-gallery-2-202209"],
 "bu-14p-256": [A % "iphone-14-pro-finish-select-202209-6-1inch-silver",
                A % "iphone-14-pro-model-unselect-gallery-1-202209"],

 "ipadpro11": [A % "ipad-pro-11-select-wifi-spaceblack-202405",
                  A % "ipad-compare-header-pro-202405"],
 "ipadair11": [A % "ipad-compare-header-air-202405"],
 "ipad11":       [A % "ipad-compare-header-202405"],
 "ipadmini7":    [A % "ipad-mini-select-wifi-spacegray-202410",
                  A % "ipad-mini-select-wifi-purple-202410",
                  A % "ipad-mini-select-wifi-starlight-202410"],

 "mba13-m3": [A % "mba13-midnight-select-202402",
              A % "mba13-m3-midnight-gallery1-202402",
              A % "mba13-m3-midnight-gallery2-202402",
              A % "mba13-m3-midnight-gallery3-202402"],
 # У M1 корпус прошлого поколения — клин, а не ровная плита. Свой рендер.
 "mba13-m1": [A % "macbook-air-space-gray-select-201810"],

 "aw-ultra2": [A % "watch-compare-ultra2-202409"],
 "aw-s10":    [A % "watch-compare-series10-202409"],
 "aw-se2":    [A % "watch-compare-se-202409"],

 "app-pro2":  [A % "airpods-pro-2-hero-select-202409"],
 "app-4": [A % "airpods-4-anc-select-202409", A % "airpods-4-select-202409"],
 "app-max":   [A % "airpods-max-select-202409-midnight",
               A % "airpods-max-select-202409-blue",
               A % "airpods-max-select-202409-orange"],

 # iPhone 15 Pro Max — тот же рендер линейки, но версия на 6,7 дюйма
 "ip15pm": [A % "iphone-15-pro-finish-select-202309-6-7inch-naturaltitanium",
            A % "iphone-15-pro-finish-select-202309-6-7inch-bluetitanium",
            A % "iphone-15-pro-model-unselect-gallery-1-202309"],
 "mba15-m3": [A % "mba15-m3-midnight-gallery1-202402",
              A % "mba15-m3-midnight-gallery2-202402",
              A % "mba15-m3-midnight-gallery3-202402"],
 # Air 11 и Air 13 отличаются только диагональю: корпус и рендер одинаковые
 "ipadair13": [A % "ipad-compare-header-air-202405"],
 # аксессуары Apple лежат в CDN под артикулами, а не под именами
 "pencil-pro": [A % "MX2D3"],
 "pencil-2":   [A % "MQLU3"],
 # В Россию едет блок с европейской вилкой, а не с американской
 "power-20w":  [A % "MHJE3", A % "MU7V2"],

 "dji-pocket4": [D % "5408da2c69b56fbd2d80fdca847ad92d"],
 "dji-action5": [D % "e4781624a38ba00d1b4a8bc3a204bd97"],
 "dji-mic3":    [D % "473691cc5e140d0341a30b31b479c627"],

 # Insta360 и Canon держат снимки на своих сайтах, каждый по-своему
 "insta-x6": ["https://wassets.insta360.com/common/7a4c39845b9f450db273c5d6b35be001/x6.png"],
 "canon-g7x3": ["https://global.canon/ja/c-museum/wp-content/uploads/2020/07/dcc884_b.jpg",
                "https://global.canon/ja/c-museum/wp-content/uploads/2020/07/dcc884-2_b.jpg"],
 # Garmin выкладывает пресс-снимки в своём ньюсруме, Honor — на странице характеристик
 "garmin-cirqa": ["https://s34181.pcdn.co/en-US/newsroom/wp-content/uploads/2026/07/CIRQA_standard_HR_black_front-right.jpg"],
 "honor-robot": ["https://www-file.honor.com/content/dam/honor/common/product-list/product-series/honor-robot-phone/honor-robot-phone-black-spec.png",
                 "https://www-file.honor.com/content/dam/honor/common/product-list/product-series/honor-robot-phone/honor-robot-phone-silver-spec.png"],
}


def скачать(url):
    запрос = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
    return urllib.request.urlopen(запрос, timeout=60).read()


def положить_на_подложку(сырое, путь, мини=False):
    им = Image.open(io.BytesIO(сырое)).convert("RGBA")
    плоско = Image.new("RGB", им.size, ФОН)
    плоско.paste(им, mask=им.split()[3])

    # У части рендеров фон не прозрачный, а свой — чаще всего светло-серый
    # #f5f5f7. Берём его из угла снимка и по нему же обрезаем поля.
    угол = плоско.getpixel((2, 2))
    фон = угол if max(abs(a - b) for a, b in zip(угол, ФОН)) > 3 else ФОН

    разница = ImageChops.difference(плоско, Image.new("RGB", им.size, фон)).convert("L")

    # Дальше перекрашиваем этот фон в белый: карточки и ленты на сайте белые,
    # и серая подложка снимка выделялась на них прямоугольником. Порог мягкий —
    # 6 единиц фон, 18 товар, между ними плавный переход, чтобы не съесть
    # антиалиасинг по контуру и светлые бока белых товаров.
    if фон != БЕЛЫЙ:
        маска = разница.point(lambda v: 0 if v <= 6 else (255 if v >= 18 else int((v - 6) * 255 / 12)))
        плоско = Image.composite(плоско, Image.new("RGB", им.size, БЕЛЫЙ), маска)

    рамка = разница.point(lambda v: 255 if v > 6 else 0).getbbox()
    if рамка:
        поле = max(6, int(min(им.size) * 0.03))
        плоско = плоско.crop((max(0, рамка[0] - поле), max(0, рамка[1] - поле),
                              min(им.width, рамка[2] + поле), min(им.height, рамка[3] + поле)))
    плоско.thumbnail((СТОРОНА, СТОРОНА), Image.LANCZOS)
    холст = Image.new("RGB", (СТОРОНА, СТОРОНА), БЕЛЫЙ)
    холст.paste(плоско, ((СТОРОНА - плоско.width) // 2, (СТОРОНА - плоско.height) // 2))
    холст.save(путь, "WEBP", quality=КАЧЕСТВО, method=6)
    вес = os.path.getsize(путь)
    if мини:
        # в каталог идёт версия поменьше: там сорок карточек на одной странице
        малый = холст.resize((МИНИ, МИНИ), Image.LANCZOS)
        путь_мини = путь.replace(".webp", "-min.webp")
        малый.save(путь_мини, "WEBP", quality=66, method=6)
        вес += os.path.getsize(путь_мини)
    return вес


def главная():
    разбор = argparse.ArgumentParser(description="Снимки товаров из официальных источников.")
    разбор.add_argument("--только", help="id товаров через запятую")
    аргументы = разбор.parse_args()

    os.chdir(os.path.dirname(os.path.abspath(__file__)))
    os.makedirs(ПАПКА, exist_ok=True)
    нужны = set(аргументы.только.split(",")) if аргументы.только else None

    with open("товары.json", encoding="utf-8") as файл:
        данные = json.load(файл)

    всего_байт, скачано = 0, 0
    for товар in данные["товары"]:
        ид = товар["id"]
        if нужны and ид not in нужны:
            continue
        адреса = КАРТА.get(ид)
        if not адреса:
            товар.pop("фото", None)
            print("  —  %-14s снимков нет, останется заглушка" % ид)
            continue

        файлы = []
        for номер, адрес in enumerate(адреса, 1):
            имя = "%s-%d" % (ид, номер)
            путь = os.path.join(ПАПКА, имя + ".webp")
            try:
                всего_байт += положить_на_подложку(скачать(адрес), путь, мини=(номер == 1))
                файлы.append(имя)
                скачано += 1
            except Exception as ош:
                print("  !  %-14s снимок %d не скачался: %s" % (ид, номер, ош))
        if файлы:
            товар["фото"] = файлы
            print("  ok %-14s %d снимк(ов)" % (ид, len(файлы)))

    with open("товары.json", "w", encoding="utf-8") as файл:
        json.dump(данные, файл, ensure_ascii=False, indent=2)

    print("\n  Скачано снимков: %d, вес %d КБ" % (скачано, всего_байт // 1024))
    print("  Списки файлов вписаны в товары.json\n")


if __name__ == "__main__":
    главная()
