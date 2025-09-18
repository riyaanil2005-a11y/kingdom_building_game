import streamlit as st

# Title for your app
st.set_page_config(page_title="Kingdom Building Game", layout="wide")
st.title("👑 Kingdom Building Game")

st.markdown(
    """
    This is my browser-based game built with HTML, CSS, and JavaScript.
    Below you can play it directly:
    """,
    unsafe_allow_html=True,
)

# Embed the game inside an iframe
st.components.v1.html(
    """
    <iframe src="game.html" width="100%" height="600" style="border:none;"></iframe>
    """,
    height=650,
)
