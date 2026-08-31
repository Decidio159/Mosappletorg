#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
товары.json → боковой фильтр и карточки каталога.

Заготовочный инструменты/каталог.py умеет только один ряд кнопок-тегов.
Здесь фильтр как в больших магазинах: цена «от» и «до», тип техники,
производитель и состояние — с числом товаров у каждого пункта.
Считать эти числа руками нельзя: они разъезжаются на первой же правке прайса.

Разметку не правят руками — правят товары.json и запускают:

    python собрать-каталог.py
    python инструменты/собрать.py --проект .

Карточка остаётся той же, что ждёт cart.js: .card.product с data-id,
data-name, data-price, data-img и кнопкой data-add.
"""

import html
import json
import os
import sys

for поток in (sys.stdout, sys.stderr):
    try:
        поток.reconfigure(encoding="utf-8")
    except (AttributeError, ValueError):
        pass

ФАЙЛ_ТОВАРОВ = "товары.json"
КУДА = "_шаблоны/куски/товары.html"
ПАПКА_ФОТО = "assets/products"
ЗАГЛУШКА = "assets/ph-product.svg"
СОСТОЯНИЯ = [("новая", "Новая"), ("бу", "Б/У")]


def щит(текст):
    return html.escape(str(текст or "").strip(), quote=True)


def цена_текстом(число):
    return "{:,}".format(int(число)).replace(",", " ") + " ₽"


def фото(товар):
    """В каталоге показываем уменьшенную версию первого снимка: карточек 32."""
    файлы = товар.get("фото") or []
    return "%s/%s-min.webp" % (ПАПКА_ФОТО, файлы[0]) if файлы else ЗАГЛУШКА


def крупное(товар):
    файлы = товар.get("фото") or []
    return "%s/%s.webp" % (ПАПКА_ФОТО, файлы[0]) if файлы else ЗАГЛУШКА


def карточка(товар):
    имя = щит(товар["имя"])
    цена = int(товар["цена"])
    старая = товар.get("старая_цена")
    снимок = щит(фото(товар))

    с = ['  <article class="card product catalog__card"',
         '           data-id="%s" data-name="%s" data-price="%d" data-img="%s"' % (
             щит(товар["id"]), имя, цена, щит(крупное(товар))),
         '           data-type="%s" data-brand="%s" data-state="%s">' % (
             щит(товар["тип"]), щит(товар["бренд"]), щит(товар["состояние"]))]
    if старая and старая > цена:
        с.append('    <span class="product__tag">−%d %%</span>' % round((1 - цена / старая) * 100))
    # по фото открывается просмотр с увеличением, по названию — страница товара
    крупные = "|".join(щит("%s/%s.webp" % (ПАПКА_ФОТО, и)) for и in (товар.get("фото") or [])) or снимок
    с.append('    <img class="product__photo" src="%s" alt="%s" width="480" height="480" '
             'loading="lazy" decoding="async" data-zoom="%s" tabindex="0" role="button" />'
             % (снимок, имя, крупные))
    с.append('    <a class="product__link" href="товар-%s.html"><span class="product__name">%s</span></a>'
             % (щит(товар["id"]), имя))
    if товар.get("описание"):
        с.append('    <p class="muted" style="font-size: 0.9rem">%s</p>' % щит(товар["описание"]))
    цена_html = ("от " if товар.get("цена_от") else "") + цена_текстом(цена)
    if старая and старая > цена:
        цена_html += '<span class="product__old">%s</span>' % цена_текстом(старая)
    с += ['    <div class="product__row">',
          '      <span class="product__price">%s</span>' % цена_html,
          '      <button class="btn btn--primary" type="button" data-add>В корзину</button>',
          '      <button class="btn btn--ghost product__compare" type="button" data-compare>',
          '        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M3 3v16a2 2 0 0 0 2 2h16"/><path d="M7 16h8"/><path d="M7 11h12"/><path d="M7 6h3"/></svg>',
          '        <span data-compare-label>К сравнению</span>',
          '      </button>',
          '    </div>',
          '  </article>']
    return "\n".join(с)


def галочка(поле, значение, подпись, сколько):
    return ("      <label class=\"facet\"><input type=\"checkbox\" data-facet=\"%s\" value=\"%s\" />"
            "<span>%s</span><b>%d</b></label>" % (поле, щит(значение), щит(подпись), сколько))


def собрать(данные):
    товары = данные["товары"]
    цены = [int(т["цена"]) for т in товары]
    минимум, максимум = min(цены), max(цены)

    типы = [(т["код"], т["имя"]) for т in данные["типы"]]
    бренды = sorted({т["бренд"] for т in товары},
                    key=lambda б: (-sum(1 for т in товары if т["бренд"] == б), б))

    сколько = lambda поле, зн: sum(1 for т in товары if т[поле] == зн)

    ф = ['<div class="catalog" data-catalog>',
         '  <aside class="facets" data-facets>',
         '    <form class="facets__box" onsubmit="return false">',
         '',
         '      <fieldset class="facets__group">',
         '        <legend>Цена, ₽</legend>',
         '        <div class="facets__price">',
         '          <input class="input" type="number" inputmode="numeric" placeholder="от" '
         'aria-label="Цена от" data-price-min min="0" />',
         '          <input class="input" type="number" inputmode="numeric" placeholder="до" '
         'aria-label="Цена до" data-price-max min="0" />',
         '        </div>',
         '        <p class="facets__hint">В каталоге от %s до %s</p>' % (
             цена_текстом(минимум), цена_текстом(максимум)),
         '      </fieldset>',
         '',
         '      <fieldset class="facets__group">',
         '        <legend>Какая техника</legend>']
    for код, подпись in типы:
        н = сколько("тип", код)
        if н:
            ф.append(галочка("type", код, подпись, н))
    ф += ['      </fieldset>', '',
          '      <fieldset class="facets__group">',
          '        <legend>Производитель</legend>']
    for бренд in бренды:
        ф.append(галочка("brand", бренд, бренд, сколько("бренд", бренд)))
    ф += ['      </fieldset>', '',
          '      <fieldset class="facets__group">',
          '        <legend>Состояние</legend>']
    for код, подпись in СОСТОЯНИЯ:
        н = сколько("состояние", код)
        if н:
            ф.append(галочка("state", код, подпись, н))
    ф += ['      </fieldset>', '',
          '      <button class="btn btn--ghost btn--wide" type="button" data-facets-reset>Сбросить фильтры</button>',
          '    </form>',
          '  </aside>', '',
          '  <div class="catalog__main">',
          '    <p class="catalog__count muted" data-catalog-count></p>',
          '    <div class="grid grid--3" data-catalog-grid>']
    ф += [карточка(т) for т in товары]
    ф += ['    </div>',
          '    <p class="catalog__empty" data-catalog-empty hidden>',
          '      Под эти условия ничего не нашлось. Снимите часть галочек — или напишите',
          '      менеджеру, мы возим под заказ почти всё.',
          '    </p>',
          '  </div>',
          '</div>']
    return "\n".join(ф), len(товары)


def главная():
    корень = os.path.dirname(os.path.abspath(__file__))
    os.chdir(корень)
    with open(ФАЙЛ_ТОВАРОВ, encoding="utf-8") as файл:
        данные = json.load(файл)

    разметка, всего = собрать(данные)
    with open(КУДА, "w", encoding="utf-8") as файл:
        файл.write("<!-- Собрано собрать-каталог.py из товары.json. Руками не править. -->\n")
        файл.write(разметка + "\n")

    без_фото = [т["имя"] for т in данные["товары"] if not т.get("фото")]
    print("\n  Товаров: %d, типов: %d, брендов: %d" % (
        всего, len(данные["типы"]), len({т["бренд"] for т in данные["товары"]})))
    if без_фото:
        print("  Без фото (%d): %s" % (len(без_фото), ", ".join(без_фото)))
    print("  Готово: %s\n" % КУДА)


if __name__ == "__main__":
    главная()
