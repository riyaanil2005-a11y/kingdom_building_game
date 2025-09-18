import streamlit as st

st.set_page_config(page_title="Kingdom Building Game", layout="wide")
st.title("👑 Kingdom Building Game")

# Read your HTML file content
with open("game.html", "r", encoding="utf-8") as f:
    game_html = f.read()

# Inject game directly
st.components.v1.html(game_html, height=800, scrolling=True)
