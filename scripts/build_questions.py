"""Generate 108 high-quality Halloween quiz questions across all 6 categories."""

import json
import sys
from pathlib import Path

# Ensure src is in python path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent / "src"))

from halloween_quiz.core.models import Difficulty, Question

QUESTIONS = [
    # ==================== SPOOKY STORIES (18 questions) ====================
    {
        "id": "spooky_01",
        "category": "spooky",
        "difficulty": "easy",
        "question": "What ghost is said to appear in mirrors when you say their name three times?",
        "options": ["Bloody Mary", "Casper", "The White Lady", "Slender Man"],
        "correct_answer": "Bloody Mary",
        "explanation": "Bloody Mary is a popular folklore legend whispered at slumber parties for generations."
    },
    {
        "id": "spooky_02",
        "category": "spooky",
        "difficulty": "easy",
        "question": "What mythical creature drinks human blood and hates garlic?",
        "options": ["Vampire", "Werewolf", "Zombie", "Mummy"],
        "correct_answer": "Vampire",
        "explanation": "Vampire folklore traditionally holds that vampires are repelled by garlic and holy symbols."
    },
    {
        "id": "spooky_03",
        "category": "spooky",
        "difficulty": "easy",
        "question": "According to legend, what brings bad luck if it crosses your path on Halloween?",
        "options": ["A black cat", "A brown owl", "A green frog", "A white raven"],
        "correct_answer": "A black cat",
        "explanation": "Black cats were historically associated with witches during the Middle Ages."
    },
    {
        "id": "spooky_04",
        "category": "spooky",
        "difficulty": "easy",
        "question": "What is the name of the Headless Horseman's spooky dwelling valley in Washington Irving's story?",
        "options": ["Sleepy Hollow", "Shadow Valley", "Silent Hill", "Dark Glen"],
        "correct_answer": "Sleepy Hollow",
        "explanation": "'The Legend of Sleepy Hollow' was written by Washington Irving in 1820."
    },
    {
        "id": "spooky_05",
        "category": "spooky",
        "difficulty": "easy",
        "question": "What creature transforms during a full moon into a wolf-like beast?",
        "options": ["Werewolf", "Wendigo", "Chupacabra", "Gargoyle"],
        "correct_answer": "Werewolf",
        "explanation": "Lycanthropy is the mythical condition where a human shifts into a wolf under full moonlight."
    },
    {
        "id": "spooky_06",
        "category": "spooky",
        "difficulty": "easy",
        "question": "What legendary vessel is doomed to sail the oceans forever without ever making port?",
        "options": ["The Flying Dutchman", "The Mary Celeste", "The Queen Anne", "The Black Pearl"],
        "correct_answer": "The Flying Dutchman",
        "explanation": "The Flying Dutchman is a legendary ghost ship that can never make port and is doomed to sail the seas forever."
    },
    {
        "id": "spooky_07",
        "category": "spooky",
        "difficulty": "medium",
        "question": "What famous hotel in Colorado inspired Stephen King to write 'The Shining'?",
        "options": ["The Stanley Hotel", "The Overlook Hotel", "The Bates Motel", "The Chelsea Hotel"],
        "correct_answer": "The Stanley Hotel",
        "explanation": "Stephen King and his wife stayed in room 217 of The Stanley Hotel in Estes Park, Colorado in 1974."
    },
    {
        "id": "spooky_08",
        "category": "spooky",
        "difficulty": "medium",
        "question": "What is the name of the weeping ghost from Mexican folklore who mourns her lost children?",
        "options": ["La Llorona", "La Catrina", "Santa Muerte", "El Coco"],
        "correct_answer": "La Llorona",
        "explanation": "La Llorona ('The Weeping Woman') is said to wander near riverbeds crying for her drowned children."
    },
    {
        "id": "spooky_09",
        "category": "spooky",
        "difficulty": "medium",
        "question": "In Scottish folklore, which water spirit shape-shifts into a horse to lure riders into rivers?",
        "options": ["Kelpie", "Selkie", "Banshee", "Brownie"],
        "correct_answer": "Kelpie",
        "explanation": "The Kelpie is a shape-shifting aquatic spirit reputed to inhabit lochs and pools in Scotland."
    },
    {
        "id": "spooky_10",
        "category": "spooky",
        "difficulty": "medium",
        "question": "What eerie phenomenon in swamps produces ghostly lights called 'Will-o'-the-wisp'?",
        "options": ["Methane gas combustion", "Firefly swarms", "Bioluminescent algae", "Static electrical discharge"],
        "correct_answer": "Methane gas combustion",
        "explanation": "Oxidation of phosphine, diphophane, and marsh gas (methane) creates faint glowing atmospheric lights."
    },
    {
        "id": "spooky_11",
        "category": "spooky",
        "difficulty": "medium",
        "question": "What was the name of the famous Tennessee entity said to have haunted the Bell family starting in 1817?",
        "options": ["The Bell Witch", "The Red Lady", "The Salem Phantom", "The Ozark Banshee"],
        "correct_answer": "The Bell Witch",
        "explanation": "The Bell Witch haunting in Adams, Tennessee is one of America's most famous early folklore hauntings."
    },
    {
        "id": "spooky_12",
        "category": "spooky",
        "difficulty": "medium",
        "question": "According to Appalachian folklore, what is the best way to keep evil spirits away from your porch?",
        "options": ["Paint the ceiling Haint Blue", "Hang garlic wreaths", "Spread sea salt on the stairs", "Bury an iron horseshoe"],
        "correct_answer": "Paint the ceiling Haint Blue",
        "explanation": "'Haint blue' porch ceilings were believed by the Gullah Geechee culture to mimic water or sky, deterring spirits."
    },
    {
        "id": "spooky_13",
        "category": "spooky",
        "difficulty": "hard",
        "question": "In Japanese folklore, what is a 'Noppera-bō'?",
        "options": ["A faceless ghost", "A flying fire head", "An umbrella goblin", "A two-mouthed woman"],
        "correct_answer": "A faceless ghost",
        "explanation": "Noppera-bō are faceless spirits that initially appear as normal humans before wiping off their facial features."
    },
    {
        "id": "spooky_14",
        "category": "spooky",
        "difficulty": "hard",
        "question": "What notorious mansion in San Jose, California was continuously built for 38 years to appease spirits?",
        "options": ["Winchester Mystery House", "Lizzie Borden Bed & Breakfast", "Villisca Axe Murder House", "Whaley House"],
        "correct_answer": "Winchester Mystery House",
        "explanation": "Sarah Winchester continuously constructed staircases leading nowhere and doors opening into walls."
    },
    {
        "id": "spooky_15",
        "category": "spooky",
        "difficulty": "hard",
        "question": "In Slavic folklore, what does the witch Baba Yaga's magical hut stand on?",
        "options": ["Chicken legs", "Giant raven talons", "A bed of bones", "Stilts made of oak"],
        "correct_answer": "Chicken legs",
        "explanation": "Baba Yaga's hut stands on dancing chicken legs and can spin around in the forest."
    },
    {
        "id": "spooky_16",
        "category": "spooky",
        "difficulty": "hard",
        "question": "What is the name of the real-life doll in Key West, Florida reputed to be cursed?",
        "options": ["Robert the Doll", "Annabelle", "Peggy the Doll", "Mandy"],
        "correct_answer": "Robert the Doll",
        "explanation": "Robert the Doll belonged to artist Robert Eugene Otto and is now kept in the Fort East Martello Museum."
    },
    {
        "id": "spooky_17",
        "category": "spooky",
        "difficulty": "hard",
        "question": "In Nordic folklore, what are 'Draugr' known as?",
        "options": ["Undead grave dwellers with superhuman strength", "Forest trolls that turn to stone", "Sea sirens who drown sailors", "Elves that bring winter storms"],
        "correct_answer": "Undead grave dwellers with superhuman strength",
        "explanation": "Draugr are reanimated corpses in Norse mythology that protect their burial mounds and treasure."
    },
    {
        "id": "spooky_18",
        "category": "spooky",
        "difficulty": "hard",
        "question": "Which Roman festival held in May was dedicated to exorcising malevolent hungry ghosts (lemures)?",
        "options": ["Lemuria", "Parentalia", "Saturnalia", "Lupercalia"],
        "correct_answer": "Lemuria",
        "explanation": "During Lemuria, the head of the household would walk barefoot at midnight spitting black beans to pacify spirits."
    },

    # ==================== COSTUMES & TRADITIONS (18 questions) ====================
    {
        "id": "costumes_01",
        "category": "costumes",
        "difficulty": "easy",
        "question": "What costume made of an old bedsheet with eye holes cut out is an all-time classic?",
        "options": ["Ghost", "Mummy", "Skeleton", "Zombie"],
        "correct_answer": "Ghost",
        "explanation": "The simple white sheet ghost costume dates back to medieval burial shrouds."
    },
    {
        "id": "costumes_02",
        "category": "costumes",
        "difficulty": "easy",
        "question": "What traditional Halloween game involves catching floating fruit with your teeth without using hands?",
        "options": ["Bobbing for apples", "Pumpkin rolling", "Pie eating contest", "Corn toss"],
        "correct_answer": "Bobbing for apples",
        "explanation": "Bobbing for apples dates back to the Roman festival of Pomona, goddess of agriculture and abundance."
    },
    {
        "id": "costumes_03",
        "category": "costumes",
        "difficulty": "easy",
        "question": "What do children traditionally shout upon knocking on doors on Halloween night?",
        "options": ["Trick or treat!", "Boo to you!", "Happy Halloween!", "Give us sweets!"],
        "correct_answer": "Trick or treat!",
        "explanation": "'Trick or treat' became the ubiquitous greeting in North America during the 1920s and 1930s."
    },
    {
        "id": "costumes_04",
        "category": "costumes",
        "difficulty": "easy",
        "question": "What pointed accessory is essential for a traditional witch costume?",
        "options": ["Pointed hat", "Pointed shoes", "Spiky wand", "Crown of horns"],
        "correct_answer": "Pointed hat",
        "explanation": "The iconic conical witch hat became prominent in illustrations during the Victorian era."
    },
    {
        "id": "costumes_05",
        "category": "costumes",
        "difficulty": "easy",
        "question": "What is the carved glowing pumpkin placed on front porches called?",
        "options": ["Jack-o'-lantern", "Will-o'-wisp", "Gourd of fire", "Spooky lantern"],
        "correct_answer": "Jack-o'-lantern",
        "explanation": "Jack-o'-lanterns were originally carved out of turnips in Ireland and Scotland before pumpkins were used."
    },
    {
        "id": "costumes_06",
        "category": "costumes",
        "difficulty": "easy",
        "question": "What classic monster costume is typically assembled with fake bolts in the neck and green skin paint?",
        "options": ["Frankenstein's Monster", "The Wolfman", "Count Dracula", "The Mummy"],
        "correct_answer": "Frankenstein's Monster",
        "explanation": "Boris Karloff's legendary 1931 portrayal created the famous flat-topped head and neck bolts."
    },
    {
        "id": "costumes_07",
        "category": "costumes",
        "difficulty": "medium",
        "question": "What was the term for children dressing in disguise and performing songs or jokes for food in Ireland and Scotland?",
        "options": ["Guising", "Mummery", "Wassailing", "Souling"],
        "correct_answer": "Guising",
        "explanation": "'Guising' (short for disguising) is the Celtic predecessor to modern trick-or-treating."
    },
    {
        "id": "costumes_08",
        "category": "costumes",
        "difficulty": "medium",
        "question": "In the Middle Ages, what pastries were baked and given to 'soulers' who promised to pray for the dead?",
        "options": ["Soul cakes", "Dead bread", "Saints' buns", "Prayer tarts"],
        "correct_answer": "Soul cakes",
        "explanation": "Soul cakes were small, spiced round cakes marked with a cross on top, given out on All Souls' Day."
    },
    {
        "id": "costumes_09",
        "category": "costumes",
        "difficulty": "medium",
        "question": "Why did ancient Celts originally disguise themselves during Samhain night?",
        "options": ["To disguise themselves so wandering spirits would not harm them", "To scare rival tribes", "To honor wild animals", "To sneak past village guards"],
        "correct_answer": "To disguise themselves so wandering spirits would not harm them",
        "explanation": "People believed that wearing disguises would fool roaming evil spirits into mistaking them for fellow spirits."
    },
    {
        "id": "costumes_10",
        "category": "costumes",
        "difficulty": "medium",
        "question": "Which country celebrates 'Día de los Muertos' featuring colorful sugar skulls (calaveras)?",
        "options": ["Mexico", "Brazil", "Spain", "Portugal"],
        "correct_answer": "Mexico",
        "explanation": "Día de los Muertos (Day of the Dead) honors deceased ancestors on November 1st and 2nd."
    },
    {
        "id": "costumes_11",
        "category": "costumes",
        "difficulty": "medium",
        "question": "What traditional Halloween costume element was inspired by 17th-century medical practitioners?",
        "options": ["Plague doctor mask", "Apothecary robe", "Leech jar pouch", "Barber-surgeon apron"],
        "correct_answer": "Plague doctor mask",
        "explanation": "Plague doctors wore beak-like masks filled with aromatic herbs to ward off miasma or diseased air."
    },
    {
        "id": "costumes_12",
        "category": "costumes",
        "difficulty": "medium",
        "question": "What color combination represents harvest warmth and the darkness of winter during Halloween?",
        "options": ["Orange and Black", "Purple and Green", "Red and White", "Yellow and Grey"],
        "correct_answer": "Orange and Black",
        "explanation": "Orange represents the autumn harvest and fall foliage, while black symbolizes death and darkness."
    },
    {
        "id": "costumes_13",
        "category": "costumes",
        "difficulty": "hard",
        "question": "In Scottish folklore, what vegetable peeling tossed over your shoulder was supposed to form the initial of your future spouse?",
        "options": ["Apple skin", "Turnip peel", "Potato skin", "Parsnip strip"],
        "correct_answer": "Apple skin",
        "explanation": "Throwing an unbroken apple peel over the left shoulder was a popular Scottish divination ritual on Halloween."
    },
    {
        "id": "costumes_14",
        "category": "costumes",
        "difficulty": "hard",
        "question": "What 1950s UNICEF campaign transformed trick-or-treating into a charitable fundraiser?",
        "options": ["Trick-or-Treat for UNICEF", "Pennies for Pumpkins", "Coins for Kids", "Treats for Peace"],
        "correct_answer": "Trick-or-Treat for UNICEF",
        "explanation": "Started in 1950 in Philadelphia, children carried small orange cardboard boxes to collect spare change for UNICEF."
    },
    {
        "id": "costumes_15",
        "category": "costumes",
        "difficulty": "hard",
        "question": "What masquerade mask originating from Venice features a bird beak and cross-dressing origins?",
        "options": ["Gnaga", "Bauta", "Moretta", "Volto"],
        "correct_answer": "Gnaga",
        "explanation": "The Gnaga mask had a cat-like face worn by men who imitated women's high voices during Venetian masquerades."
    },
    {
        "id": "costumes_16",
        "category": "costumes",
        "difficulty": "hard",
        "question": "What was 'Mischief Night' historically called in Northern England and Scotland?",
        "options": ["Punkie Night", "Devil's Night", "Nutcrack Night", "Hop-tu-Naa"],
        "correct_answer": "Nutcrack Night",
        "explanation": "Halloween in the North of England was called Nutcrack Night because families threw nuts into the fire for divination."
    },
    {
        "id": "costumes_17",
        "category": "costumes",
        "difficulty": "hard",
        "question": "On the Isle of Man, what is the indigenous Celtic celebration held on October 31st called?",
        "options": ["Hop-tu-Naa", "Samhuinn", "Calan Gaeaf", "Kalan Goañv"],
        "correct_answer": "Hop-tu-Naa",
        "explanation": "Hop-tu-Naa is celebrated on the Isle of Man with turnip lanterns and traditional folk songs."
    },
    {
        "id": "costumes_18",
        "category": "costumes",
        "difficulty": "hard",
        "question": "What company produced the iconic plastic character masks with elastic bands in the 1960s to 1980s?",
        "options": ["Ben Cooper, Inc.", "Hasbro", "Don Post Studios", "Kenner"],
        "correct_answer": "Ben Cooper, Inc.",
        "explanation": "Ben Cooper, Inc. produced cheap vacuum-formed vinyl masks packaged in cardboard window boxes."
    },

    # ==================== HORROR MOVIES (18 questions) ====================
    {
        "id": "movies_01",
        "category": "movies",
        "difficulty": "easy",
        "question": "Who is the masked killer in the 'Halloween' movie franchise?",
        "options": ["Michael Myers", "Jason Voorhees", "Freddy Krueger", "Leatherface"],
        "correct_answer": "Michael Myers",
        "explanation": "Michael Myers debuted in John Carpenter's 1978 horror masterpiece 'Halloween'."
    },
    {
        "id": "movies_02",
        "category": "movies",
        "difficulty": "easy",
        "question": "What weapon does Freddy Krueger famously wield in 'A Nightmare on Elm Street'?",
        "options": ["A glove with razor blades", "A chainsaw", "A machete", "A meat hook"],
        "correct_answer": "A glove with razor blades",
        "explanation": "Freddy Krueger stalks his victims in their dreams armed with a bladed leather glove."
    },
    {
        "id": "movies_03",
        "category": "movies",
        "difficulty": "easy",
        "question": "Which family's theme song includes the famous double finger-snap?",
        "options": ["The Addams Family", "The Munsters", "The Simpsons", "The Brady Bunch"],
        "correct_answer": "The Addams Family",
        "explanation": "Vic Mizzy composed the catchy, finger-snapping theme song for 'The Addams Family'."
    },
    {
        "id": "movies_04",
        "category": "movies",
        "difficulty": "easy",
        "question": "What line does Jack Nicholson famously yell after chopping through a door in 'The Shining'?",
        "options": ["Here's Johnny!", "Honey, I'm home!", "Open sesame!", "Boo! Did I scare you?"],
        "correct_answer": "Here's Johnny!",
        "explanation": "Nicholson improvised the phrase borrowed from Ed McMahon's introduction on 'The Tonight Show'."
    },
    {
        "id": "movies_05",
        "category": "movies",
        "difficulty": "easy",
        "question": "What is the name of the camp where Jason Voorhees drowned in 'Friday the 13th'?",
        "options": ["Camp Crystal Lake", "Camp Blackwood", "Camp Stillwater", "Camp Whispering Pines"],
        "correct_answer": "Camp Crystal Lake",
        "explanation": "Camp Crystal Lake (dubbed 'Camp Blood' by locals) is the setting for the slasher series."
    },
    {
        "id": "movies_06",
        "category": "movies",
        "difficulty": "easy",
        "question": "In 'Beetlejuice', how many times must you say his name to summon him?",
        "options": ["Three times", "Two times", "Five times", "Seven times"],
        "correct_answer": "Three times",
        "explanation": "Saying 'Beetlejuice, Beetlejuice, Beetlejuice' summons the eccentric ghost with the most."
    },
    {
        "id": "movies_07",
        "category": "movies",
        "difficulty": "medium",
        "question": "In which year was John Carpenter's original 'Halloween' released?",
        "options": ["1978", "1975", "1980", "1982"],
        "correct_answer": "1978",
        "explanation": "'Halloween' was released on October 25, 1978, launching Jamie Lee Curtis into stardom."
    },
    {
        "id": "movies_08",
        "category": "movies",
        "difficulty": "medium",
        "question": "What mask was modified and spray-painted white to create Michael Myers' face in 'Halloween'?",
        "options": ["Captain Kirk (William Shatner)", "Richard Nixon", "Frankenstein", "Alfred E. Neuman"],
        "correct_answer": "Captain Kirk (William Shatner)",
        "explanation": "Production designer Tommy Lee Wallace bought a $1.98 Don Post Captain Kirk mask and altered it."
    },
    {
        "id": "movies_09",
        "category": "movies",
        "difficulty": "medium",
        "question": "In the 1993 Disney classic 'Hocus Pocus', what are the names of the three Sanderson sisters?",
        "options": ["Winifred, Sarah, and Mary", "Glinda, Elphaba, and Nessarose", "Agatha, Wanda, and Monica", "Piper, Phoebe, and Prue"],
        "correct_answer": "Winifred, Sarah, and Mary",
        "explanation": "Bette Midler, Sarah Jessica Parker, and Kathy Najimy starred as the comedic witch trio."
    },
    {
        "id": "movies_10",
        "category": "movies",
        "difficulty": "medium",
        "question": "What 1999 found-footage film was made for roughly $60,000 and grossed nearly $250 million?",
        "options": ["The Blair Witch Project", "Paranormal Activity", "[REC]", "Cloverfield"],
        "correct_answer": "The Blair Witch Project",
        "explanation": "'The Blair Witch Project' revolutionized viral movie marketing on the early internet in 1999."
    },
    {
        "id": "movies_11",
        "category": "movies",
        "difficulty": "medium",
        "question": "What is the name of the doll possessed by the soul of serial killer Charles Lee Ray?",
        "options": ["Chucky", "Annabelle", "Billy", "Slappy"],
        "correct_answer": "Chucky",
        "explanation": "Chucky is the Good Guy doll in 'Child's Play' (1988) voiced by Brad Dourif."
    },
    {
        "id": "movies_12",
        "category": "movies",
        "difficulty": "medium",
        "question": "In Alfred Hitchcock's 'Psycho', what motel does Marion Crane stop at during a storm?",
        "options": ["Bates Motel", "Overlook Motel", "Stanley Motel", "Hillcrest Inn"],
        "correct_answer": "Bates Motel",
        "explanation": "Norman Bates manages the isolated Bates Motel alongside his mysterious 'Mother'."
    },
    {
        "id": "movies_13",
        "category": "movies",
        "difficulty": "hard",
        "question": "What 1922 German Expressionist silent film was an unauthorized adaptation of Bram Stoker's 'Dracula'?",
        "options": ["Nosferatu", "The Cabinet of Dr. Caligari", "Faust", "Metropolis"],
        "correct_answer": "Nosferatu",
        "explanation": "F.W. Murnau directed 'Nosferatu', renaming Dracula to Count Orlok to avoid copyright infringement."
    },
    {
        "id": "movies_14",
        "category": "movies",
        "difficulty": "hard",
        "question": "In 'The Exorcist' (1973), what ancient Mesopotamian demonic deity is the entity possessing Regan?",
        "options": ["Pazuzu", "Baal", "Asmodeus", "Moloch"],
        "correct_answer": "Pazuzu",
        "explanation": "Pazuzu, the mythological king of wind demons, was unearthed by Father Merrin in Northern Iraq."
    },
    {
        "id": "movies_15",
        "category": "movies",
        "difficulty": "hard",
        "question": "Who composed the chilling synthesizer theme music for John Carpenter's 'Halloween'?",
        "options": ["John Carpenter himself", "Ennio Morricone", "Bernard Herrmann", "Jerry Goldsmith"],
        "correct_answer": "John Carpenter himself",
        "explanation": "Carpenter composed the signature 5/4 time signature piano theme in just three days."
    },
    {
        "id": "movies_16",
        "category": "movies",
        "difficulty": "hard",
        "question": "What was the original title of Wes Craven's 1996 slasher movie before it was renamed 'Scream'?",
        "options": ["Scary Movie", "Ghostface", "Woodsboro Murders", "Dead Call"],
        "correct_answer": "Scary Movie",
        "explanation": "The script was titled 'Scary Movie'; the name was later repurposed by the Wayans brothers' parody."
    },
    {
        "id": "movies_17",
        "category": "movies",
        "difficulty": "hard",
        "question": "In Roman Polanski's 'Rosemary's Baby', what foul-smelling root does Rosemary wear in an amulet necklace?",
        "options": ["Tannis root", "Mandrake root", "Wolfsbane root", "Nightshade root"],
        "correct_answer": "Tannis root",
        "explanation": "Tannis root (fictional herb) was given to Rosemary by Minnie Castevet in an ominous silver pendant."
    },
    {
        "id": "movies_18",
        "category": "movies",
        "difficulty": "hard",
        "question": "What 1968 George A. Romero film pioneered the modern zombie genre without using the word 'zombie'?",
        "options": ["Night of the Living Dead", "Dawn of the Dead", "White Zombie", "Day of the Dead"],
        "correct_answer": "Night of the Living Dead",
        "explanation": "The film referred to the creatures exclusively as 'ghouls' or 'flesh-eaters'."
    },

    # ==================== HALLOWEEN HISTORY (18 questions) ====================
    {
        "id": "history_01",
        "category": "history",
        "difficulty": "easy",
        "question": "On which calendar date is Halloween officially celebrated worldwide?",
        "options": ["October 31st", "October 30th", "November 1st", "September 30th"],
        "correct_answer": "October 31st",
        "explanation": "Halloween is always celebrated on the eve of All Saints' Day, October 31st."
    },
    {
        "id": "history_02",
        "category": "history",
        "difficulty": "easy",
        "question": "In which country did the tradition of carving jack-o'-lanterns originate?",
        "options": ["Ireland", "United States", "Germany", "France"],
        "correct_answer": "Ireland",
        "explanation": "Irish immigrants brought the carving tradition to the United States in the 19th century."
    },
    {
        "id": "history_03",
        "category": "history",
        "difficulty": "easy",
        "question": "What vegetable was originally carved in Ireland before pumpkins were discovered in America?",
        "options": ["Turnips", "Potatoes", "Cabbages", "Beets"],
        "correct_answer": "Turnips",
        "explanation": "Turnips and rutabagas were hollowed out and lit with embers to keep evil spirits at bay."
    },
    {
        "id": "history_04",
        "category": "history",
        "difficulty": "easy",
        "question": "What does the word 'Hallow' in Halloween mean?",
        "options": ["Holy or saintly person", "Hollow pumpkin", "Howling wind", "Spooky ghost"],
        "correct_answer": "Holy or saintly person",
        "explanation": "From Old English 'hālig' meaning holy; 'All Hallows' Eve' is the eve of All Saints' Day."
    },
    {
        "id": "history_05",
        "category": "history",
        "difficulty": "easy",
        "question": "What ancient Celtic festival marks the end of the harvest and is the historical root of Halloween?",
        "options": ["Samhain", "Beltane", "Yule", "Imbolc"],
        "correct_answer": "Samhain",
        "explanation": "Samhain (pronounced SOW-in) marked the Gaelic division between the light half and dark half of the year."
    },
    {
        "id": "history_06",
        "category": "history",
        "difficulty": "easy",
        "question": "Which Christian holiday immediately follows Halloween on November 1st?",
        "options": ["All Saints' Day", "All Souls' Day", "Ascension Day", "Epiphany"],
        "correct_answer": "All Saints' Day",
        "explanation": "All Saints' Day (All Hallows) honors all known and unknown saints of the church."
    },
    {
        "id": "history_07",
        "category": "history",
        "difficulty": "medium",
        "question": "According to Irish folklore, who was Jack-o'-lantern named after?",
        "options": ["Stingy Jack", "Jumping Jack", "Black Jack", "Mad Jack"],
        "correct_answer": "Stingy Jack",
        "explanation": "Stingy Jack was a trickster who tricked the Devil twice and was cursed to wander with an ember inside a turnip."
    },
    {
        "id": "history_08",
        "category": "history",
        "difficulty": "medium",
        "question": "Which Pope officially shifted All Saints' Day to November 1st in the 8th century?",
        "options": ["Pope Gregory III", "Pope Urban II", "Pope Leo X", "Pope Innocent III"],
        "correct_answer": "Pope Gregory III",
        "explanation": "Pope Gregory III dedicated an oratory in St. Peter's to all saints on November 1st."
    },
    {
        "id": "history_09",
        "category": "history",
        "difficulty": "medium",
        "question": "What major 1840s historical event brought hundreds of thousands of Irish immigrants and their Halloween lore to America?",
        "options": ["The Irish Potato Famine", "The Easter Rising", "The English Civil War", "The Napoleonic Wars"],
        "correct_answer": "The Irish Potato Famine",
        "explanation": "The Great Famine (1845-1852) led over a million Irish people to emigrate, cementing Halloween in the US."
    },
    {
        "id": "history_10",
        "category": "history",
        "difficulty": "medium",
        "question": "What Roman goddess of fruit, seeds, and orchards influenced Halloween apple traditions?",
        "options": ["Pomona", "Ceres", "Flora", "Vesta"],
        "correct_answer": "Pomona",
        "explanation": "Pomona was often depicted with apples; when Romans occupied Celtic lands, her festivals blended with Samhain."
    },
    {
        "id": "history_11",
        "category": "history",
        "difficulty": "medium",
        "question": "Which US state produces the largest number of pumpkins each year?",
        "options": ["Illinois", "California", "Ohio", "Pennsylvania"],
        "correct_answer": "Illinois",
        "explanation": "Illinois produces over twice as many pumpkins as any other state, processing over 90% of canned pumpkin in the US."
    },
    {
        "id": "history_12",
        "category": "history",
        "difficulty": "medium",
        "question": "During the Salem Witch Trials of 1692, how many people were executed by burning at the stake?",
        "options": ["Zero (none were burned)", "Nineteen", "Seven", "Thirty-three"],
        "correct_answer": "Zero (none were burned)",
        "explanation": "None were burned at Salem; 19 were hanged, one was pressed with heavy stones, and several died in jail."
    },
    {
        "id": "history_13",
        "category": "history",
        "difficulty": "hard",
        "question": "In what decade did the phrase 'trick or treat' first appear in print in North America?",
        "options": ["1920s (1927 in Alberta, Canada)", "1880s", "1950s", "1900s"],
        "correct_answer": "1920s (1927 in Alberta, Canada)",
        "explanation": "The earliest known printed mention of 'trick or treat' was in the Blackie, Alberta newspaper in November 1927."
    },
    {
        "id": "history_14",
        "category": "history",
        "difficulty": "hard",
        "question": "What was the original Celtic bonfire festival ceremony at Samhain intended to accomplish?",
        "options": ["Re-lighting household hearths from a single sacred communal fire", "Burning scarecrows to frighten wolves", "Sending smoke signals to neighboring hillforts", "Melting iron cauldrons for war"],
        "correct_answer": "Re-lighting household hearths from a single sacred communal fire",
        "explanation": "Druids built a central sacred bonfire, and each family extinguished their home fire and relit it from the sacred flame."
    },
    {
        "id": "history_15",
        "category": "history",
        "difficulty": "hard",
        "question": "Which city claims to be the 'Halloween Capital of the World' for hosting the first city-wide parade in 1920?",
        "options": ["Anoka, Minnesota", "Salem, Massachusetts", "Sleepy Hollow, New York", "Keene, New Hampshire"],
        "correct_answer": "Anoka, Minnesota",
        "explanation": "Anoka, Minnesota held its first civic Halloween celebration in 1920 to deter teenage pranks and property damage."
    },
    {
        "id": "history_16",
        "category": "history",
        "difficulty": "hard",
        "question": "What is the Welsh name for the night before winter (Halloween eve)?",
        "options": ["Nos Galan Gaeaf", "Calan Mai", "Gŵyl Fair", "Samhain Cymru"],
        "correct_answer": "Nos Galan Gaeaf",
        "explanation": "Nos Galan Gaeaf in Wales is marked by tales of the Ysbryd Glân (white spirit) and the tailless black sow."
    },
    {
        "id": "history_17",
        "category": "history",
        "difficulty": "hard",
        "question": "In 1938, what Halloween radio broadcast panicked thousands of Americans into believing Martians had invaded?",
        "options": ["Orson Welles' 'The War of the Worlds'", "H.G. Wells' 'The Time Machine'", "Bram Stoker's 'Dracula'", "Edgar Allan Poe's 'The Raven'"],
        "correct_answer": "Orson Welles' 'The War of the Worlds'",
        "explanation": "The Mercury Theatre on the Air broadcast simulated breaking news bulletins on October 30, 1938."
    },
    {
        "id": "history_18",
        "category": "history",
        "difficulty": "hard",
        "question": "What Scottish poet immortalized the holiday's traditional rituals in his 1785 poem titled simply 'Halloween'?",
        "options": ["Robert Burns", "Walter Scott", "Lord Byron", "Robert Louis Stevenson"],
        "correct_answer": "Robert Burns",
        "explanation": "Robert Burns recorded Scottish customs like pulling kale stalks and sowing hemp seed in his famous 28-stanza poem."
    },

    # ==================== CANDY & TREATS (18 questions) ====================
    {
        "id": "candy_01",
        "category": "candy",
        "difficulty": "easy",
        "question": "What tri-colored candy resembling a kernel is quintessential for Halloween?",
        "options": ["Candy Corn", "Gummy Worms", "Jelly Beans", "Rock Candy"],
        "correct_answer": "Candy Corn",
        "explanation": "Candy corn features yellow, orange, and white layers resembling dried corn kernels."
    },
    {
        "id": "candy_02",
        "category": "candy",
        "difficulty": "easy",
        "question": "What is the most popular Halloween candy in the United States by sales?",
        "options": ["Reese's Peanut Butter Cups", "Snickers", "Skittles", "Kit Kat"],
        "correct_answer": "Reese's Peanut Butter Cups",
        "explanation": "Reese's Peanut Butter Cups consistently top annual rankings as America's favorite Halloween candy."
    },
    {
        "id": "candy_03",
        "category": "candy",
        "difficulty": "easy",
        "question": "What candy bar features wafer cookies coated in milk chocolate and can be snapped apart?",
        "options": ["Kit Kat", "Twix", "Milky Way", "3 Musketeers"],
        "correct_answer": "Kit Kat",
        "explanation": "Kit Kat's iconic 'Gimme a break' slogan emphasizes snapping its chocolate-covered wafers."
    },
    {
        "id": "candy_04",
        "category": "candy",
        "difficulty": "easy",
        "question": "What sweet treat made by dipping fruit into boiled caramelized sugar is eaten on a wooden stick?",
        "options": ["Caramel Apple", "Candied Plum", "Sugar Peach", "Chocolate Cherry"],
        "correct_answer": "Caramel Apple",
        "explanation": "Caramel apples were invented by Dan Walker, a Kraft Foods sales representative, in the 1950s."
    },
    {
        "id": "candy_05",
        "category": "candy",
        "difficulty": "easy",
        "question": "Which candy invites you to 'Taste the Rainbow'?",
        "options": ["Skittles", "M&Ms", "Starburst", "Smarties"],
        "correct_answer": "Skittles",
        "explanation": "'Taste the Rainbow' has been Skittles' colorful marketing tagline since 1994."
    },
    {
        "id": "candy_06",
        "category": "candy",
        "difficulty": "easy",
        "question": "What chocolate candy features candy-coated shells with an 'm' stamped on each piece?",
        "options": ["M&Ms", "Reese's Pieces", "Sixlets", "Whoppers"],
        "correct_answer": "M&Ms",
        "explanation": "M&Ms were created in 1941 to allow soldiers to carry chocolate in warm weather without it melting."
    },
    {
        "id": "candy_07",
        "category": "candy",
        "difficulty": "medium",
        "question": "What was Candy Corn originally named when it was invented in the 1880s?",
        "options": ["Chicken Feed", "Harvest Kernels", "Sugar Maize", "Farm Sweets"],
        "correct_answer": "Chicken Feed",
        "explanation": "Wunderle Candy Company originally marketed it as 'Chicken Feed' with a rooster on the box."
    },
    {
        "id": "candy_08",
        "category": "candy",
        "difficulty": "medium",
        "question": "What chocolate candy was named after the inventor's favorite family horse?",
        "options": ["Snickers", "Twix", "Butterfinger", "Baby Ruth"],
        "correct_answer": "Snickers",
        "explanation": "Frank Mars named the peanut-and-caramel Snickers bar after the Mars family's favorite horse."
    },
    {
        "id": "candy_09",
        "category": "candy",
        "difficulty": "medium",
        "question": "What chewy cocoa candy was the first individually wrapped penny candy sold in the US?",
        "options": ["Tootsie Roll", "Necco Wafers", "Bit-O-Honey", "Milk Duds"],
        "correct_answer": "Tootsie Roll",
        "explanation": "Leo Hirschfield invented the Tootsie Roll in 1896 and named it after his daughter's nickname, Tootsie."
    },
    {
        "id": "candy_10",
        "category": "candy",
        "difficulty": "medium",
        "question": "Which candy comes with miniature plastic dispensers topped with character heads?",
        "options": ["PEZ", "Pop Rocks", "Fun Dip", "Ring Pop"],
        "correct_answer": "PEZ",
        "explanation": "PEZ was invented in Austria in 1927 as a breath mint; its name comes from the German word PfeffErminZ."
    },
    {
        "id": "candy_11",
        "category": "candy",
        "difficulty": "medium",
        "question": "Which company produces the tiny chewy candies shaped like fruit slices called Swedish Fish?",
        "options": ["Malaco (Mondelēz)", "Haribo", "Ferrara", "Jelly Belly"],
        "correct_answer": "Malaco (Mondelēz)",
        "explanation": "Swedish Fish were originally developed in the late 1950s by Swedish candy maker Malaco specifically for the US."
    },
    {
        "id": "candy_12",
        "category": "candy",
        "difficulty": "medium",
        "question": "Roughly how many pounds of candy are sold in the US each Halloween season?",
        "options": ["600 million pounds", "100 million pounds", "2 billion pounds", "50 million pounds"],
        "correct_answer": "600 million pounds",
        "explanation": "The National Confectioners Association estimates nearly 600 million pounds of candy are purchased for Halloween."
    },
    {
        "id": "candy_13",
        "category": "candy",
        "difficulty": "hard",
        "question": "What chemical process gives Pop Rocks candy its signature fizzy and crackling sensation?",
        "options": ["Trapped carbon dioxide gas escaping at 600 psi", "Citric acid reacting with baking soda", "Sodium bicarbonate exploding in moisture", "Nitrogen gas sublimation"],
        "correct_answer": "Trapped carbon dioxide gas escaping at 600 psi",
        "explanation": "Sugar syrup is mixed with CO2 at 600 pounds per square inch; cooling traps tiny high-pressure bubbles."
    },
    {
        "id": "candy_14",
        "category": "candy",
        "difficulty": "hard",
        "question": "What candy was famously used by Elliott to lure E.T. in Steven Spielberg's 1982 film?",
        "options": ["Reese's Pieces", "M&Ms", "Skittles", "Gobstoppers"],
        "correct_answer": "Reese's Pieces",
        "explanation": "Mars declined Spielberg's request to feature M&Ms, so Hershey stepped in with Reese's Pieces, skyrocketing sales."
    },
    {
        "id": "candy_15",
        "category": "candy",
        "difficulty": "hard",
        "question": "Why were 3 Musketeers candy bars originally given their three-part name in 1932?",
        "options": ["They originally contained three flavors: chocolate, vanilla, and strawberry", "They were marketed to three-person families", "They were sliced into three equal pieces", "Three candy makers jointly developed them"],
        "correct_answer": "They originally contained three flavors: chocolate, vanilla, and strawberry",
        "explanation": "During WWII, sugar rationing forced Mars to eliminate vanilla and strawberry, leaving only the chocolate nougat."
    },
    {
        "id": "candy_16",
        "category": "candy",
        "difficulty": "hard",
        "question": "In what year was the first mass-produced chocolate candy bar made by J.S. Fry & Sons in England?",
        "options": ["1847", "1776", "1905", "1923"],
        "correct_answer": "1847",
        "explanation": "Fry & Sons combined cocoa butter, sugar, and cocoa powder into a moldable paste in Bristol, England in 1847."
    },
    {
        "id": "candy_17",
        "category": "candy",
        "difficulty": "hard",
        "question": "What natural insect resin was historically used to give candies like candy corn their shiny glaze?",
        "options": ["Confectioner's glaze (Shellac from lac bugs)", "Beeswax", "Gum Arabic", "Carnauba wax"],
        "correct_answer": "Confectioner's glaze (Shellac from lac bugs)",
        "explanation": "Confectioner's glaze is derived from resin secreted by the female lac beetle (Kerria lacca) in India and Thailand."
    },
    {
        "id": "candy_18",
        "category": "candy",
        "difficulty": "hard",
        "question": "What chewy peanut butter candy was packaged in plain black-and-orange wax paper twists without branding?",
        "options": ["Halloween Peanut Butter Kisses (Mary Janes/Chews)", "Butterfinger Minis", "Chick-O-Sticks", "Squirrel Nut Zippers"],
        "correct_answer": "Halloween Peanut Butter Kisses (Mary Janes/Chews)",
        "explanation": "These molasses and peanut butter chews wrapped in plain orange and black paper were a classic trick-or-treat staple."
    },

    # ==================== PARANORMAL LORE (18 questions) ====================
    {
        "id": "paranormal_01",
        "category": "paranormal",
        "difficulty": "easy",
        "question": "What ghost-hunting device is used to measure electromagnetic fluctuations?",
        "options": ["EMF Meter", "Geiger Counter", "Barometer", "Seismograph"],
        "correct_answer": "EMF Meter",
        "explanation": "EMF meters detect electromagnetic fields, which paranormal investigators hypothesize are emitted by spirits."
    },
    {
        "id": "paranormal_02",
        "category": "paranormal",
        "difficulty": "easy",
        "question": "What board game featuring letters and a heart-shaped planchette is used to contact the dead?",
        "options": ["Ouija Board", "Tarot Table", "Spirit Board", "Scrabble"],
        "correct_answer": "Ouija Board",
        "explanation": "The talking board was patented in 1891 by Elijah Bond and later popularized as the Ouija board by Hasbro."
    },
    {
        "id": "paranormal_03",
        "category": "paranormal",
        "difficulty": "easy",
        "question": "What winged cryptid with glowing red eyes is associated with Point Pleasant, West Virginia?",
        "options": ["Mothman", "Jersey Devil", "Chupacabra", "Wendigo"],
        "correct_answer": "Mothman",
        "explanation": "Mothman was sighted in Point Pleasant between 1966 and the tragic collapse of the Silver Bridge in 1967."
    },
    {
        "id": "paranormal_04",
        "category": "paranormal",
        "difficulty": "easy",
        "question": "What is the name for a noisy, disruptive ghost that throws dishes and bangs on walls?",
        "options": ["Poltergeist", "Banshee", "Wraith", "Specter"],
        "correct_answer": "Poltergeist",
        "explanation": "From the German words 'poltern' (to make a racket) and 'geist' (spirit or ghost)."
    },
    {
        "id": "paranormal_05",
        "category": "paranormal",
        "difficulty": "easy",
        "question": "What audio anomaly stands for voices or sounds recorded on tape that weren't heard in the room?",
        "options": ["EVP (Electronic Voice Phenomenon)", "UHF (Ultra High Frequency)", "AMR (Audio Mystery Resonance)", "VHF (Very High Frequency)"],
        "correct_answer": "EVP (Electronic Voice Phenomenon)",
        "explanation": "EVP refers to faint electronic voices or whisper captures found during playback of digital or analog recordings."
    },
    {
        "id": "paranormal_06",
        "category": "paranormal",
        "difficulty": "easy",
        "question": "What mythical goat-sucking beast originated in Puerto Rican folklore in the 1990s?",
        "options": ["El Chupacabra", "El Silbón", "La Ciguapa", "El Cadejo"],
        "correct_answer": "El Chupacabra",
        "explanation": "Chupacabra literally translates to 'goat sucker' after strange livestock deaths in Puerto Rico in 1995."
    },
    {
        "id": "paranormal_07",
        "category": "paranormal",
        "difficulty": "medium",
        "question": "What psychological phenomenon explains why users unconsciously move the Ouija planchette themselves?",
        "options": ["Ideomotor effect", "Placebo effect", "Cognitive dissonance", "Confirmation bias"],
        "correct_answer": "Ideomotor effect",
        "explanation": "The ideomotor effect causes involuntary, unconscious muscle movements that players do not consciously register."
    },
    {
        "id": "paranormal_08",
        "category": "paranormal",
        "difficulty": "medium",
        "question": "What radio scanner sweeps rapidly through AM/FM frequencies to capture purported spirit voices?",
        "options": ["Spirit Box (Ghost Box)", "Thermal Scanner", "Oscilloscope", "Spectrum Analyzer"],
        "correct_answer": "Spirit Box (Ghost Box)",
        "explanation": "Spirit boxes sweep through radio bands at fractions of a second to create fragmented audio white noise."
    },
    {
        "id": "paranormal_09",
        "category": "paranormal",
        "difficulty": "medium",
        "question": "What cryptid is said to haunt the Pine Barrens of southern New Jersey?",
        "options": ["The Jersey Devil", "The Flatwoods Monster", "The Dover Demon", "The Beast of Bray Road"],
        "correct_answer": "The Jersey Devil",
        "explanation": "Legend claims the 13th child of Mother Leeds in 1735 transformed into a bipedal horned creature with bat wings."
    },
    {
        "id": "paranormal_10",
        "category": "paranormal",
        "difficulty": "medium",
        "question": "What Scottish lake is famous for alleged sightings of a prehistoric aquatic cryptid nicknamed 'Nessie'?",
        "options": ["Loch Ness", "Loch Lomond", "Loch Morar", "Loch Tay"],
        "correct_answer": "Loch Ness",
        "explanation": "Sightings of the Loch Ness monster date back to Saint Columba in 565 AD, with worldwide fame beginning in 1933."
    },
    {
        "id": "paranormal_11",
        "category": "paranormal",
        "difficulty": "medium",
        "question": "What camera technology is used by investigators to see temperature anomalies in haunted buildings?",
        "options": ["FLIR / Thermal imaging camera", "Night vision scope", "Full-spectrum camera", "Infrared strobe"],
        "correct_answer": "FLIR / Thermal imaging camera",
        "explanation": "Forward Looking Infrared (FLIR) cameras visualize infrared radiation and surface temperature variations."
    },
    {
        "id": "paranormal_12",
        "category": "paranormal",
        "difficulty": "medium",
        "question": "In parapsychology, what is an 'Apport'?",
        "options": ["A physical object that mysteriously appears or disappears during a seance", "A ghost of a deceased pet", "A telepathic vision during sleep", "A cold draft felt in a warm room"],
        "correct_answer": "A physical object that mysteriously appears or disappears during a seance",
        "explanation": "An apport is the alleged paranormal transference of an object through solid matter into a closed space."
    },
    {
        "id": "paranormal_13",
        "category": "paranormal",
        "difficulty": "hard",
        "question": "What theory suggests that high stone or mineral walls record traumatic emotions like magnetic tape?",
        "options": ["Stone Tape Theory", "Residual Quantum Theory", "Geomagnetic Resonance", "Acoustic Archeology"],
        "correct_answer": "Stone Tape Theory",
        "explanation": "Coined by archaeologist T.C. Lethbridge, it posits that emotional energy can be stored in quartz or limestone rocks."
    },
    {
        "id": "paranormal_14",
        "category": "paranormal",
        "difficulty": "hard",
        "question": "What sound frequency (around 18.98 Hz) is known as the 'Ghost Frequency' for causing chills and eye vibrations?",
        "options": ["Infrasound", "Ultrasound", "Microsound", "Megasound"],
        "correct_answer": "Infrasound",
        "explanation": "Infrasound resonates with the human eye globe (18 Hz), causing optical illusions, dread, and hyperventilation."
    },
    {
        "id": "paranormal_15",
        "category": "paranormal",
        "difficulty": "hard",
        "question": "What 1970s paranormal investigation duo investigated the Amityville Horror and the Enfield Poltergeist?",
        "options": ["Ed and Lorraine Warren", "Harry Price and Arthur Conan Doyle", "Peter Venkman and Egon Spengler", "Hans Holzer and Sybil Leek"],
        "correct_answer": "Ed and Lorraine Warren",
        "explanation": "The Warrens founded the New England Society for Psychic Research and inspired 'The Conjuring' universe."
    },
    {
        "id": "paranormal_16",
        "category": "paranormal",
        "difficulty": "hard",
        "question": "What is the sensory isolation experiment called that tests for telepathy using ping-pong balls over eyes and red light?",
        "options": ["Ganzfeld experiment", "Milgram experiment", "Stanford sensory test", "Monroe hemisphere sync"],
        "correct_answer": "Ganzfeld experiment",
        "explanation": "The Ganzfeld technique induces mild sensory deprivation to test for extrasensory perception (ESP)."
    },
    {
        "id": "paranormal_17",
        "category": "paranormal",
        "difficulty": "hard",
        "question": "Which English ghost hunter spent a year leasing and investigating the famously haunted Borley Rectory in 1937?",
        "options": ["Harry Price", "Charles Fort", "Lionel Algernon", "Colin Wilson"],
        "correct_answer": "Harry Price",
        "explanation": "Harry Price dubbed Borley Rectory 'The Most Haunted House in England' and enrolled 48 volunteer observers."
    },
    {
        "id": "paranormal_18",
        "category": "paranormal",
        "difficulty": "hard",
        "question": "What cryptid sighted in Flatwoods, Braxton County, West Virginia in 1952 was described as having a spade-shaped cowl?",
        "options": ["The Flatwoods Monster (Green Monster)", "The Loveland Frogman", "The Van Meter Visitor", "The Hopkinsville Goblin"],
        "correct_answer": "The Flatwoods Monster (Green Monster)",
        "explanation": "Witnesses reported a 10-foot entity emitting pungent mist, accompanied by a pulsating red fireball."
    }
]

def main():
    validated = []
    for q_dict in QUESTIONS:
        q = Question(
            id=q_dict["id"],
            category=q_dict["category"],
            difficulty=Difficulty.from_str(q_dict["difficulty"]),
            question=q_dict["question"],
            options=q_dict["options"],
            correct_answer=q_dict["correct_answer"],
            explanation=q_dict["explanation"]
        )
        validated.append(q)

    print(f"Validated {len(validated)} questions successfully with Pydantic!")

    by_cat = {}
    for q in validated:
        by_cat.setdefault(q.category, []).append({
            "id": q.id,
            "question": q.question,
            "options": q.options,
            "correct_answer": q.correct_answer,
            "difficulty": q.difficulty.value,
            "explanation": q.explanation
        })

    out_path = Path("assets/questions.json")
    with open(out_path, "w", encoding="utf-8") as f:
        json.dump(by_cat, f, indent=2, ensure_ascii=False)

    print(f"Successfully generated and wrote {len(validated)} questions across {len(by_cat)} categories to {out_path}!")

if __name__ == "__main__":
    main()
