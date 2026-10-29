import { LandingPage } from "@/components/landing-page"

export default function Home() {
  const router = useRouter()
  const [showLanguageSelector, setShowLanguageSelector] = useState(false)
  const [selectedLanguage, setSelectedLanguage] = useState<string | null>(null)

  useEffect(() => {
    // Check if language is already selected
    const storedLanguage = localStorage.getItem("preferredLanguage")
    if (storedLanguage) {
      setSelectedLanguage(storedLanguage)
    } else {
      setShowLanguageSelector(true)
    }
  }, [])

  const handleLanguageSelect = (language: string) => {
    localStorage.setItem("preferredLanguage", language)
    setSelectedLanguage(language)
    setShowLanguageSelector(false)
  }

  return (
    <>
      <AnimatePresence>
        {showLanguageSelector && (
          <Dialog open={showLanguageSelector} onOpenChange={setShowLanguageSelector}>
            <DialogContent className="sm:max-w-md" hideClose>
              <motion.div
                className="flex flex-col items-center justify-center space-y-6 py-6"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.3 }}
              >
                <h2 className="text-2xl font-bold text-center">
                  Select Your Language / உங்கள் மொழியை தேர்வுசெய்க / अपनी भाषा चुनें
                </h2>
                <div className="flex flex-col space-y-4 w-full">
                  <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>
                    <Button size="lg" className="w-full text-lg py-6" onClick={() => handleLanguageSelect("english")}>
                      English
                    </Button>
                  </motion.div>
                  <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>
                    <Button size="lg" className="w-full text-lg py-6" onClick={() => handleLanguageSelect("tamil")}>
                      தமிழ் (Tamil)
                    </Button>
                  </motion.div>
                  <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>
                    <Button size="lg" className="w-full text-lg py-6" onClick={() => handleLanguageSelect("hindi")}>
                      हिन्दी (Hindi)
                    </Button>
                  </motion.div>
                </div>
              </motion.div>
            </DialogContent>
          </Dialog>
        )}
      </AnimatePresence>

      {selectedLanguage && <LandingPage language={selectedLanguage} />}
    </>
  )
}
