package com.procucev.speechtotext;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;

@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@ActiveProfiles("test")
class SpeechToTextApplicationTests {

    @Test
    @DisplayName("Spring Application Context loads successfully")
    void contextLoads() {
    }
}
