from better_profanity import profanity

FILIPINO_BADWORDS = [
    'putangina', 'puta', 'tangina', 'gago', 'tanga', 'bobo', 'ulol', 'tarantado',
    'leche', 'peste', 'buwisit', 'kupal', 'kingina', 'pokpok', 'tamod', 'kantot',
    'jakol', 'chupa', 'supsup', 'hindot', 'hayop', 'animal', 'inutil', 'walang kwenta',
    'punyeta', 'pakyu', 'lintek', 'yawa', 'hudas', 'demonyo', 'salot', 'bwisit',
    'lintik', 'pucha', 'piste', 'pakshet', 'amputa', 'potangina', 'potanginamo',
    'tanginamo', 'putanginamo', 'gagong', 'tangong', 'bobong', 'ulul', 'ungas',
    'gunggong', 'shunga', 'engot', 'ogag', 'tarantadong', 'pakshit', 'bwakaw',
    'pukinangina', 'bilat', 'kepyas', 'pepe', 'tite', 'burat', 'bayag',
    
    # Variations and common misspellings
    'p*ta', 'tang*na', 'g*go', 't*nga', 'put@', 'g@go', 't@nga', 'pota', 'puta ng ina',
    'putang ina mo', 'tangi na mo', 'gago ka', 'tanga ka', 'bobo ka',
    
    # Bisaya/Cebuano profanity
    'yawa', 'atay', 'buang', 'buwang', 'luod', 'pisti', 'pisteng yawa',
    
    # Ilokano profanity
    'ukinam', 'ukininam', 'agpayso', 'baboy',
]

# Additional English variations to ensure coverage
ADDITIONAL_ENGLISH = [
    'fck', 'fuk', 'fvck', 'sh1t', 'sht', 'a$$', 'a$$hole', 'b1tch', 'btch',
    'd1ck', 'd1ck', 'fag', 'faggot', 'bastard', 'cunt', 'c0ck', 'motherfucker',
    'motherf*cker', 'f*ck', 'sh*t', 'b*tch', 'a**', 'a**hole', 'whore', 'slut',
    'dumbass', 'dumb@$$', 'jackass', 'jack@$$', 'retard', 'retarded',
]

def initialize_profanity_filter():
    # Load default English profanity list
    profanity.load_censor_words()
    
    # Add Filipino bad words
    profanity.add_censor_words(FILIPINO_BADWORDS)
    
    # Add additional English variations
    profanity.add_censor_words(ADDITIONAL_ENGLISH)
    
    print(f"✅ Profanity filter initialized with {len(FILIPINO_BADWORDS)} Filipino words")


def contains_profanity(text):
    if not text:
        return False
    
    return profanity.contains_profanity(text.lower())


def censor_profanity(text, censor_char='*'):
    if not text:
        return text
    
    return profanity.censor(text, censor_char)


def get_profanity_words(text):
    if not text:
        return []
    
    words = text.lower().split()
    profane_words = []
    
    # Check each word
    for word in words:
        # Remove common punctuation
        clean_word = word.strip('.,!?;:"\'()[]{}')
        if profanity.contains_profanity(clean_word):
            profane_words.append(clean_word)
    
    return profane_words


def validate_content(text, field_name="Content"):
    if not text:
        return True, None
    
    if contains_profanity(text):
        profane_words = get_profanity_words(text)
        return False, f"{field_name} contains inappropriate language. Please remove offensive words and try again."
    
    return True, None

if __name__ == "__main__":
    initialize_profanity_filter()